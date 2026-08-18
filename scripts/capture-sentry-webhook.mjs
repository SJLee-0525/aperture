/**
 * Sentry issue alert 웹훅의 실물 페이로드를 받아 fixture 로 저장한다 (docs/plan/10 §13.2).
 *
 * 공식 문서는 헤더 이름과 `data.event` 필드 이름까지만 정한다. `exception` 하위 구조와
 * `tags` 원소 표현은 정하지 않아 정규화 코드를 쓰기 전에 실물이 필요하다.
 *
 * 사용법:
 *   node scripts/capture-sentry-webhook.mjs
 *   npx cloudflared tunnel --url http://localhost:8787
 * 출력된 공개 주소를 Sentry 통합의 Webhook URL 로 넣고 합성 오류를 한 번 낸다.
 *
 * 캡처가 끝나면 이 파일과 package.json 의 스크립트 항목을 지운다. 앱 코드가 아니다.
 */

import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "src/features/sentry-triage/_lib/__fixtures__");
const port = Number(process.env.PORT ?? 8787);

/** 실측 페이로드는 약 14KB 다. 캡처 단계에서는 넉넉히 두고 거절 시 크기를 남긴다. */
const MAX_BODY_BYTES = 20_000_000;

let captureCount = 0;

/**
 * 본문을 크기 상한 안에서 모은다.
 *
 * @param {import("node:http").IncomingMessage} request
 * @returns {Promise<string | null>} 상한을 넘으면 null.
 */
const readBody = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        request.destroy();
        resolve(null);
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });

/**
 * 정규화 코드를 쓰기 전에 알아야 할 것만 요약한다.
 * 예외·스택이 `data.event.exception` 에 있는지 `entries` 아래에 있는지가 핵심이다.
 *
 * @param {string} body
 * @returns {void}
 */
const describePayload = (body) => {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    console.log("  본문이 JSON 이 아니다. 파일을 직접 확인한다.");
    return;
  }

  const event = parsed?.data?.event ?? {};
  const entries = Array.isArray(event.entries) ? event.entries : null;

  console.log(`  최상위 키: ${Object.keys(parsed).join(", ")}`);
  console.log(`  action: ${parsed.action ?? "(없음)"}`);
  console.log(`  triggered_rule: ${parsed?.data?.triggered_rule ?? "(없음)"}`);
  console.log(`  event 키: ${Object.keys(event).join(", ")}`);
  console.log(`  event.exception 존재: ${Boolean(event.exception)}`);
  console.log(
    `  event.entries 존재: ${Boolean(entries)}${
      entries ? ` (type: ${entries.map((entry) => entry?.type).join(", ")})` : ""
    }`,
  );
  console.log(`  tags 표현: ${JSON.stringify(event.tags?.slice?.(0, 2) ?? event.tags ?? null)}`);
  console.log(`  short_id 존재: ${Boolean(event.short_id ?? event.issue_short_id)}`);
};

const server = createServer(async (request, response) => {
  if (request.method !== "POST") {
    response.writeHead(405).end();
    return;
  }

  const body = await readBody(request).catch(() => null);
  // Sentry 는 응답이 늦거나 실패하면 재전송한다. 먼저 끝내고 파일을 쓴다.
  response.writeHead(body === null ? 413 : 200).end();
  if (body === null) {
    console.log(`본문이 상한(${MAX_BODY_BYTES} bytes)을 넘어 거절했다.`);
    return;
  }

  captureCount += 1;
  const suffix = captureCount === 1 ? "" : `-${captureCount}`;
  const bodyPath = path.join(outDir, `event-alert${suffix}.json`);
  const headerPath = path.join(outDir, `event-alert${suffix}.headers.json`);

  await mkdir(outDir, { recursive: true });
  // 본문은 받은 그대로 쓴다. 다시 직렬화하면 서명 대상 문자열과 달라진다.
  await writeFile(bodyPath, body);
  await writeFile(headerPath, `${JSON.stringify(request.headers, null, 2)}\n`);

  const hookHeaders = Object.entries(request.headers)
    .filter(([name]) => name.startsWith("sentry-hook") || name === "request-id")
    .map(([name, value]) => `${name}: ${value}`);

  console.log(`\n[${captureCount}] ${body.length} bytes → ${path.relative(root, bodyPath)}`);
  console.log(`  헤더: ${hookHeaders.length ? hookHeaders.join(" | ") : "(sentry-hook-* 없음)"}`);
  describePayload(body);
});

server.listen(port, () => {
  console.log(`Sentry 웹훅 캡처 대기 중: http://localhost:${port}`);
  console.log(`저장 위치: ${path.relative(root, outDir)}/`);
  console.log("터널: npx cloudflared tunnel --url http://localhost:" + port);
  console.log("종료: Ctrl+C\n");
});
