import { describe, expect, it } from "vitest";

import {
  REDACTED,
  scrubBreadcrumb,
  scrubEvent,
  scrubReplayEvent,
  scrubQueryString,
  scrubUrl,
} from "@/lib/monitoring/scrub-event";

import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

describe("scrubQueryString / scrubUrl", () => {
  it.each([
    ["q=서울+야경", `q=${REDACTED}`],
    ["token=abc123", `token=${REDACTED}`],
    ["code=oauth-code", `code=${REDACTED}`],
    ["Q=upper&TOKEN=x", `Q=${REDACTED}&TOKEN=${REDACTED}`],
  ])("민감 쿼리 %s 의 값을 마스킹한다", (input, expected) => {
    expect(scrubQueryString(input)).toBe(expected);
  });

  it("민감하지 않은 키와 =가 없는 조각은 그대로 둔다", () => {
    expect(scrubQueryString("photo=abc&flag&work=x")).toBe("photo=abc&flag&work=x");
  });

  it("값 안의 =를 보존한다", () => {
    expect(scrubQueryString("photo=a=b")).toBe("photo=a=b");
  });

  it("URL의 쿼리만 마스킹하고 경로는 유지한다", () => {
    expect(scrubUrl("https://example.com/ko/search?q=피아노&lang=ko")).toBe(
      `https://example.com/ko/search?q=${REDACTED}&lang=ko`,
    );
  });

  it("쿼리가 없는 URL은 원본을 반환한다", () => {
    expect(scrubUrl("/ko/photo")).toBe("/ko/photo");
  });
});

describe("scrubEvent", () => {
  it("Authorization 헤더의 관리자 access token을 마스킹한다 (대소문자 무관)", () => {
    const event = {
      request: {
        headers: { Authorization: "Bearer admin-access-token", accept: "application/json" },
      },
    } as unknown as ErrorEvent;

    scrubEvent(event);
    expect(event.request?.headers).toEqual({
      Authorization: REDACTED,
      accept: "application/json",
    });
  });

  it("요청 본문을 경로 구분 없이 통째로 제거한다 — /api/chat 방문자 질문 보호", () => {
    const event = {
      request: {
        url: "https://example.com/api/chat",
        data: { messages: [{ role: "user", content: "비밀 질문" }] },
      },
    } as unknown as ErrorEvent;

    scrubEvent(event);
    expect(event.request?.data).toBe(REDACTED);
  });

  it("쿠키를 제거하고 URL·query_string의 민감 쿼리를 마스킹한다", () => {
    const event = {
      request: {
        url: "https://example.com/ko/search?q=검색어",
        query_string: "q=검색어&lang=ko",
        cookies: { "ap-lang-pref-v1": "ko" },
      },
    } as unknown as ErrorEvent;

    scrubEvent(event);
    expect(event.request?.url).toBe(`https://example.com/ko/search?q=${REDACTED}`);
    expect(event.request?.query_string).toBe(`q=${REDACTED}&lang=ko`);
    expect(event.request?.cookies).toEqual({ [REDACTED]: REDACTED });
  });

  it("request가 없는 이벤트는 그대로 반환한다", () => {
    const event = { message: "boom" } as unknown as ErrorEvent;
    expect(scrubEvent(event)).toBe(event);
  });
});

describe("scrubBreadcrumb", () => {
  it("fetch url과 navigation from/to의 민감 쿼리를 마스킹한다", () => {
    const breadcrumb = {
      category: "navigation",
      data: {
        url: "/api/search-index?token=abc",
        from: "/ko/search?q=서울",
        to: "/ko/photo?photo=p1",
      },
    } as unknown as Breadcrumb;

    const result = scrubBreadcrumb(breadcrumb);
    expect(result.data).toEqual({
      url: `/api/search-index?token=${REDACTED}`,
      from: `/ko/search?q=${REDACTED}`,
      to: "/ko/photo?photo=p1",
    });
  });

  it("data가 없는 breadcrumb은 그대로 반환한다", () => {
    const breadcrumb = { category: "console" } as Breadcrumb;
    expect(scrubBreadcrumb(breadcrumb)).toBe(breadcrumb);
  });
});

describe("scrubReplayEvent", () => {
  it("Replay meta와 breadcrumb URL의 민감 쿼리를 마스킹한다", () => {
    const meta = {
      type: 4,
      data: { href: "https://example.com/ko/search?q=비밀&project=p1" },
    };
    const breadcrumb = {
      type: 5,
      data: {
        payload: {
          category: "navigation",
          data: { from: "/ko/search?q=비밀", to: "/ko/photo?photo=p1" },
        },
      },
    };

    expect(scrubReplayEvent(meta).data.href).toBe(
      `https://example.com/ko/search?q=${REDACTED}&project=p1`,
    );
    expect(scrubReplayEvent(breadcrumb).data.payload.data).toEqual({
      from: `/ko/search?q=${REDACTED}`,
      to: "/ko/photo?photo=p1",
    });
  });
});
