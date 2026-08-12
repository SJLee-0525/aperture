import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  SECURITY_HEADERS,
  STORAGE_IMAGE_HOSTS,
} from "@/constants/security-headers";

const directive = (policy: string, name: string) =>
  policy
    .split("; ")
    .find((entry) => entry.startsWith(`${name} `))
    ?.slice(name.length + 1) ?? "";

describe("Content-Security-Policy", () => {
  it("프로덕션 정책에는 'unsafe-eval'이 들어가지 않는다", () => {
    // 배포 정책에 새어 들어가면 임의 문자열 실행을 열어줘 CSP 의 의미가 크게 줄어든다.
    expect(buildContentSecurityPolicy(false)).not.toContain("'unsafe-eval'");
  });

  it("개발 정책에만 'unsafe-eval'을 연다", () => {
    // Next dev(webpack HMR)가 모듈을 eval 로 감싸므로, 빠지면 dev 서버 스크립트가 전부 차단된다.
    expect(directive(buildContentSecurityPolicy(true), "script-src")).toContain("'unsafe-eval'");
  });

  it("두 정책의 차이는 'unsafe-eval' 하나뿐이다", () => {
    // 개발 편의가 배포 정책과 다른 방향으로 벌어지면 dev 에서 통과한 검증이 무의미해진다.
    const development = buildContentSecurityPolicy(true).replace(" 'unsafe-eval'", "");
    expect(development).toBe(buildContentSecurityPolicy(false));
  });

  it("지도·캡차·임베드가 죽지 않도록 필수 소스를 유지한다", () => {
    const policy = buildContentSecurityPolicy(false);

    // MapLibre 는 워커를 blob: 으로 만든다 — 빠지면 지도가 통째로 죽는다.
    expect(directive(policy, "worker-src")).toContain("blob:");
    // CARTO 벡터 타일은 샤딩된 tiles-a~d 서브도메인에서 온다 — 빠지면 베이스맵만 백지가 된다.
    expect(directive(policy, "connect-src")).toContain("https://*.basemaps.cartocdn.com");
    // style.json 은 bare 도메인 — 와일드카드가 커버하지 않으므로 별도로 있어야 한다.
    expect(directive(policy, "connect-src")).toContain("https://basemaps.cartocdn.com");
    // hCaptcha 는 스크립트·프레임을 자기 호스트에서 가져온다 — 빠지면 연락 폼이 제출 불가가 된다.
    expect(directive(policy, "script-src")).toContain("https://*.hcaptcha.com");
    expect(directive(policy, "frame-src")).toContain("https://*.hcaptcha.com");
    // 공개 사진은 Storage 파생본을 그대로 전송한다.
    expect(directive(policy, "img-src")).toContain("https://firebasestorage.googleapis.com");
  });

  it("업로드 이미지 호스트를 img-src 에 모두 연다", () => {
    const imgSrc = directive(buildContentSecurityPolicy(false), "img-src");

    // 콘텐츠가 참조하는 출처와 CSP 가 어긋나면 렌더는 통과했는데 브라우저가 막아 빈 칸만 남는다.
    STORAGE_IMAGE_HOSTS.forEach((host) => expect(imgSrc).toContain(host));
  });

  it("GA4 로더와 수집 비콘 경로를 함께 연다", () => {
    const policy = buildContentSecurityPolicy(false);

    // 로더(gtag.js)만 열고 수집 호스트를 빠뜨리면 스크립트는 뜨는데 이벤트가 전부 유실된다.
    expect(directive(policy, "script-src")).toContain("https://www.googletagmanager.com");
    expect(directive(policy, "connect-src")).toContain("https://www.google-analytics.com");
    // 지역 엔드포인트(region1.google-analytics.com)로 나가는 비콘.
    expect(directive(policy, "connect-src")).toContain("https://*.google-analytics.com");
    // fetch 가 막힌 환경의 1x1 픽셀 폴백.
    expect(directive(policy, "img-src")).toContain("https://www.google-analytics.com");
  });

  it("클릭재킹과 폼 하이재킹 방어를 유지한다", () => {
    const policy = buildContentSecurityPolicy(false);

    // 관리자 1명 구조라 로그인 화면 프레이밍은 곧 전 섹션 쓰기 권한 탈취다.
    expect(directive(policy, "frame-ancestors")).toBe("'none'");
    expect(directive(policy, "form-action")).toBe("'self'");
    expect(directive(policy, "base-uri")).toBe("'self'");
    expect(directive(policy, "object-src")).toBe("'none'");
  });

  it("인라인 초기화 스크립트는 유지하면서 HTML 이벤트 속성 실행을 차단한다", () => {
    const policy = buildContentSecurityPolicy(false);

    expect(directive(policy, "script-src")).toContain("'unsafe-inline'");
    expect(directive(policy, "script-src-attr")).toBe("'none'");
  });
});

describe("Permissions-Policy", () => {
  it("WebMCP 도구 등록을 동일 출처로 한정한다", () => {
    // 빠지면 브라우저 기본값에 의존하게 되고, 교차 출처 iframe 위임 차단이 문서화되지 않는다.
    const permissionsPolicy = SECURITY_HEADERS.find(
      (header) => header.key === "Permissions-Policy",
    );
    expect(permissionsPolicy?.value).toContain("tools=(self)");
  });
});
