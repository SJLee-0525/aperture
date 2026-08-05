import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy } from "@/constants/security-headers";

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
    // hCaptcha 는 스크립트·프레임을 자기 호스트에서 가져온다 — 빠지면 연락 폼이 제출 불가가 된다.
    expect(directive(policy, "script-src")).toContain("https://*.hcaptcha.com");
    expect(directive(policy, "frame-src")).toContain("https://*.hcaptcha.com");
    // 공개 사진은 Storage 파생본을 그대로 전송한다.
    expect(directive(policy, "img-src")).toContain("https://firebasestorage.googleapis.com");
  });

  it("클릭재킹과 폼 하이재킹 방어를 유지한다", () => {
    const policy = buildContentSecurityPolicy(false);

    // 관리자 1명 구조라 로그인 화면 프레이밍은 곧 전 섹션 쓰기 권한 탈취다.
    expect(directive(policy, "frame-ancestors")).toBe("'none'");
    expect(directive(policy, "form-action")).toBe("'self'");
    expect(directive(policy, "base-uri")).toBe("'self'");
    expect(directive(policy, "object-src")).toBe("'none'");
  });
});
