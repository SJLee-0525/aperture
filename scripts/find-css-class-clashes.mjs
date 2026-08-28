import { readFileSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 한 요소에 얹힌 클래스들이 같은 속성을 선언하는 자리를 찾는다.
 *
 * 클래스 하나짜리 셀렉터는 명시도가 같아 승자를 스타일시트 삽입 순서가 정한다. 같은 파일
 * 안에서는 그 순서가 작성 순서라 예측할 수 있지만, 서로 다른 스타일시트끼리는 청크 로딩
 * 순서에 달려 있어 라우트 진입 경로에 따라 뒤집힌다.
 *
 * 세 경로를 본다.
 * 1. 한 JSX 요소에 직접 얹힌 클래스들 (모듈 A + 모듈 B, 모듈 + 전역 유틸)
 * 2. `className` 을 prop 으로 받아 자기 클래스와 합치는 컴포넌트와 그 호출부
 * 3. maplibre 가 클래스를 직접 다는 요소 (지도 컨테이너, 마커)
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const toPosix = (path) => path.split("\\").join("/");

/** `.cls { … }` 에서 대상 요소에 직접 걸리는 클래스별 property 집합. */
const propsByClass = (cssText) => {
  const out = new Map();
  for (const match of cssText.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim();
    if (selector.startsWith("@")) continue;
    const props = new Set();
    for (const declaration of match[2].split(";")) {
      const name = declaration.split(":")[0]?.trim();
      if (name && !name.startsWith("--") && !name.startsWith("/*")) props.add(name);
    }
    if (props.size === 0) continue;
    for (const part of selector.split(",")) {
      const last = part.trim().split(/[\s>+~]+/).pop() ?? "";
      /* 클래스 하나만으로 이루어진 셀렉터만 센다. `.a:hover` 나 `.a.b` 는 조건이 붙거나
         명시도가 높아 순서가 승자를 정하지 않는다. */
      const bare = /^\.([A-Za-z_][-\w]*)$/.exec(last);
      if (!bare) continue;
      const bucket = out.get(bare[1]) ?? new Set();
      for (const prop of props) bucket.add(prop);
      out.set(bare[1], bucket);
    }
  }
  return out;
};

const intersect = (a, b) => [...a].filter((value) => b.has(value)).sort();

/** 파일이 import 하는 CSS 모듈 별칭 → 모듈 경로. */
const aliasMap = (filePath, source) => {
  const folder = dirname(filePath);
  const out = new Map();
  for (const match of source.matchAll(/import\s+(\w+)\s+from\s+"([^"]+\.module\.css)"/g)) {
    const [, alias, request] = match;
    const target = request.startsWith("@/")
      ? join(ROOT, "src", request.slice(2))
      : join(folder, request);
    out.set(alias, toPosix(normalize(target)));
  }
  return out;
};

const CLASSNAME = /className=(\{(?:[^{}]|\{[^{}]*\})*\}|"[^"]*")/g;
const lineOf = (source, index) => source.slice(0, index).split("\n").length;

/** className 표현식에서 쓰인 문자열 리터럴 토큰. `${…}` 는 지운다. */
const literalClasses = (expression) =>
  [...expression.matchAll(/"([^"]*)"/g), ...expression.matchAll(/`([^`]*)`/g)]
    .flatMap((match) => match[1].replace(/\$\{[^}]*\}/g, " ").split(/\s+/))
    .filter(Boolean);

/**
 * @param {{ files: Array<{ path: string, source: string }>, readCss: (path: string) => string }} input
 * @returns {Array<{ file: string, line: number, left: string, right: string, properties: string[] }>}
 */
const findCssClassClashes = ({ files, readCss }) => {
  const cssCache = new Map();
  const propsOf = (cssPath) => {
    if (!cssCache.has(cssPath)) cssCache.set(cssPath, propsByClass(readCss(cssPath)));
    return cssCache.get(cssPath);
  };
  const globalsPath = toPosix(join(ROOT, "src/app/globals.css"));
  const globals = propsOf(globalsPath);
  const findings = [];
  const add = (file, line, left, right, properties) => {
    if (properties.length > 0) findings.push({ file, line, left, right, properties });
  };

  /** 한 표현식이 가리키는 (스타일시트, 이름, 속성) 목록. */
  const sourcesIn = (expression, aliases) => {
    const out = [];
    for (const [, alias, key] of expression.matchAll(/(\w+)\.(\w+)/g)) {
      const cssPath = aliases.get(alias);
      if (!cssPath) continue;
      out.push([cssPath, `${alias}.${key}`, propsOf(cssPath).get(key) ?? new Set()]);
    }
    for (const token of literalClasses(expression)) {
      if (globals.has(token)) out.push([globalsPath, `global .${token}`, globals.get(token)]);
    }
    return out;
  };

  // 1) 한 요소에 직접 얹힌 클래스들
  for (const { path, source } of files) {
    const aliases = aliasMap(path, source);
    for (const match of source.matchAll(CLASSNAME)) {
      const entries = sourcesIn(match[1], aliases);
      for (let i = 0; i < entries.length; i += 1) {
        for (let j = i + 1; j < entries.length; j += 1) {
          const [leftCss, leftName, leftProps] = entries[i];
          const [rightCss, rightName, rightProps] = entries[j];
          // 같은 스타일시트면 작성 순서가 승자를 정한다. 예측 가능하므로 대상이 아니다.
          if (leftCss === rightCss) continue;
          add(
            toPosix(relative(ROOT, path)),
            lineOf(source, match.index),
            leftName,
            rightName,
            intersect(leftProps, rightProps),
          );
        }
      }
    }
  }

  // 2) className 을 받아 자기 클래스와 합치는 컴포넌트
  const mergers = new Map();
  for (const { path, source } of files) {
    const aliases = aliasMap(path, source);
    for (const match of source.matchAll(CLASSNAME)) {
      const expression = match[1];
      if (!expression.replace("className=", "").includes("className")) continue;
      const own = sourcesIn(expression, aliases).filter(([cssPath]) => cssPath !== globalsPath);
      if (own.length === 0) continue;
      const name = path.split(/[\\/]/).pop().replace(/\.tsx$/, "");
      mergers.set(name, [...(mergers.get(name) ?? []), ...own]);
    }
  }
  for (const { path, source } of files) {
    const aliases = aliasMap(path, source);
    for (const [name, own] of mergers) {
      const callSite = new RegExp(`<${name}\\b[^>]*?className=\\{([^}]*)\\}`, "gs");
      for (const match of source.matchAll(callSite)) {
        for (const [callerCss, callerName, callerProps] of sourcesIn(match[1], aliases)) {
          for (const [ownCss, ownName, ownProps] of own) {
            if (ownCss === callerCss) continue;
            add(
              toPosix(relative(ROOT, path)),
              lineOf(source, match.index),
              `${name} 자신의 ${ownName}`,
              `호출부 ${callerName}`,
              intersect(callerProps, ownProps),
            );
          }
        }
      }
    }
  }

  // 3) maplibre 가 클래스를 직접 다는 요소
  const maplibreCss = join(ROOT, "node_modules/maplibre-gl/dist/maplibre-gl.css");
  const maplibre = propsOf(toPosix(maplibreCss));
  // 지도 컨테이너에는 `.maplibregl-map`, 마커 요소에는 `.maplibregl-marker` 가 붙는다.
  const attached = ["maplibregl-map", "maplibregl-marker"];
  for (const { path, source } of files) {
    if (!source.includes("maplibre-gl/dist/maplibre-gl.css")) continue;
    const aliases = aliasMap(path, source);
    const uses = [
      ...source.matchAll(CLASSNAME),
      ...source.matchAll(/className\s*=\s*(\w+\.\w+);/g),
    ];
    for (const match of uses) {
      for (const [cssPath, name, props] of sourcesIn(match[1], aliases)) {
        if (cssPath === globalsPath) continue;
        for (const libraryClass of attached) {
          add(
            toPosix(relative(ROOT, path)),
            lineOf(source, match.index),
            name,
            `.${libraryClass} (maplibre)`,
            intersect(props, maplibre.get(libraryClass) ?? new Set()),
          );
        }
      }
    }
  }

  return findings;
};

const readCssFile = (path) => readFileSync(path, "utf8");

export { findCssClassClashes, propsByClass, readCssFile, ROOT, toPosix };
