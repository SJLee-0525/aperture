import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { LOCALE_PREFERENCE_COOKIE } from "@/constants/locale-preference";

import { proxy } from "@/proxy";

const request = (
  path: string,
  options: { method?: string; acceptLanguage?: string; cookie?: string } = {},
) =>
  new NextRequest(`https://example.com${path}`, {
    method: options.method,
    headers: {
      ...(options.acceptLanguage ? { "accept-language": options.acceptLanguage } : {}),
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
  });

describe("root locale proxy", () => {
  it.each([
    ["ko-KR", "/ko"],
    ["en-US", "/en"],
    ["ja-JP", "/en"],
  ] as const)("%s 요청을 %s로 307 이동한다", (acceptLanguage, pathname) => {
    const response = proxy(request("/", { acceptLanguage }));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe(pathname);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("언어 헤더가 없으면 /ko로 이동한다", () => {
    const response = proxy(request("/"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/ko");
  });

  it("명시적 선호 쿠키가 브라우저 언어보다 우선한다", () => {
    const response = proxy(
      request("/", {
        acceptLanguage: "ko-KR",
        cookie: `${LOCALE_PREFERENCE_COOKIE}=en`,
      }),
    );
    expect(response.headers.get("location")).toBe("https://example.com/en");
  });

  it("query의 중복·빈 값·인코딩을 보존한다", () => {
    const response = proxy(
      request("/?a=1&a=2&empty=&q=%EC%84%9C%EC%9A%B8", { acceptLanguage: "en" }),
    );
    expect(response.headers.get("location")).toBe(
      "https://example.com/en?a=1&a=2&empty=&q=%EC%84%9C%EC%9A%B8",
    );
  });

  it.each(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])(
    "%s는 언어 리다이렉트를 적용하지 않는다",
    (method) => {
      const response = proxy(request("/", { method, acceptLanguage: "en" }));
      expect(response.status).toBe(200);
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it("HEAD는 body 없이 같은 언어 정책을 사용한다", () => {
    const response = proxy(request("/", { method: "HEAD", acceptLanguage: "en" }));
    expect(response.status).toBe(307);
    expect(response.body).toBeNull();
    expect(response.headers.get("location")).toBe("https://example.com/en");
  });
});
