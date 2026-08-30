import { describe, expect, it, vi } from "vitest";

import {
  preflightPerformanceTargets,
  resolveHtmlTarget,
  siteOrigin,
  targetUrls,
  verifyRootLocaleRedirect,
} from "@/lib/performance-alerts/site-target";

const response = (status: number, headers: HeadersInit = {}): Response =>
  new Response(null, { status, headers });

describe("performance site target", () => {
  it("origin과 대표 URL을 정규화한다", () => {
    expect(siteOrigin(" https://sungjoon.works/ ")).toBe("https://sungjoon.works");
    expect(targetUrls("https://sungjoon.works", [{ id: "home", path: "/ko" }])).toEqual([
      { id: "home", path: "/ko", url: "https://sungjoon.works/ko" },
    ]);
  });

  it.each([
    [undefined, "required"],
    ["not a URL", "valid URL"],
    ["http://sungjoon.works", "HTTPS"],
    ["https://user:pass@sungjoon.works", "credentials"],
    ["https://sungjoon.works:444", "port"],
    ["https://sungjoon.works/ko", "without path"],
    ["https://sungjoon.works/?q=1", "without path"],
    ["https://sungjoon.works/#top", "without path"],
  ])("잘못된 SITE_URL %s를 거부한다", (value, message) => {
    expect(() => siteOrigin(value)).toThrow(message);
  });

  it("루트의 같은 origin 언어 이동을 확인한다", async () => {
    const request = vi.fn().mockResolvedValue(response(307, { location: "/ko" }));
    await expect(verifyRootLocaleRedirect("https://sungjoon.works", request)).resolves.toBe(
      "https://sungjoon.works/ko",
    );
    expect(request).toHaveBeenCalledWith("https://sungjoon.works/", {
      headers: { "Accept-Language": "ko" },
      redirect: "manual",
    });
  });

  it.each([
    [response(200), "307"],
    [response(307), "missing Location"],
    [response(307, { location: "https://example.com/ko" }), "left the configured origin"],
    [response(307, { location: "/fr" }), "unsupported locale path"],
  ])("잘못된 루트 이동을 거부한다", async (result, message) => {
    await expect(
      verifyRootLocaleRedirect("https://sungjoon.works", vi.fn().mockResolvedValue(result)),
    ).rejects.toThrow(message);
  });

  it("같은 origin redirect 뒤의 HTML URL을 반환한다", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(response(308, { location: "/ko/photo/" }))
      .mockResolvedValueOnce(response(200, { "content-type": "text/html; charset=utf-8" }));
    await expect(
      resolveHtmlTarget("https://sungjoon.works/ko/photo", "https://sungjoon.works", request),
    ).resolves.toBe("https://sungjoon.works/ko/photo/");
  });

  it.each([
    [[response(302, { location: "https://example.com/ko" })], "left the configured origin"],
    [[response(500)], "returned 500"],
    [[response(200, { "content-type": "application/json" })], "did not return HTML"],
    [[response(302, { location: "/ko" }), response(302, { location: "/ko" })], "Redirect loop"],
  ])("잘못된 대표 URL 응답을 거부한다", async (results, message) => {
    const request = vi.fn();
    for (const result of results) request.mockResolvedValueOnce(result);
    await expect(
      resolveHtmlTarget("https://sungjoon.works/ko", "https://sungjoon.works", request),
    ).rejects.toThrow(message);
  });

  it("루트와 모든 대표 URL을 한 계약으로 확인한다", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(response(307, { location: "/ko" }))
      .mockResolvedValueOnce(response(200, { "content-type": "text/html" }));
    await expect(
      preflightPerformanceTargets("https://sungjoon.works", [{ id: "home", path: "/ko" }], request),
    ).resolves.toEqual({
      origin: "https://sungjoon.works",
      rootDestination: "https://sungjoon.works/ko",
      targets: [{ id: "home", path: "/ko", url: "https://sungjoon.works/ko" }],
    });
  });
});
