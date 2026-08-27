import { describe, expect, it } from "vitest";

import { detailQueryHref } from "@/lib/navigation/detail-query-url";

describe("detailQueryHref", () => {
  it("상세 키만 바꾸고 나머지 query 는 남긴다", () => {
    const href = detailQueryHref(
      { pathname: "/ko/photo", search: "?tag=street&camera=X100V" },
      "photo",
      "photo-1",
    );

    const params = new URLSearchParams(href.split("?")[1]);
    expect(href.startsWith("/ko/photo?")).toBe(true);
    expect(params.get("tag")).toBe("street");
    expect(params.get("camera")).toBe("X100V");
    expect(params.get("photo")).toBe("photo-1");
  });

  it("앞의 물음표가 없어도 같은 결과를 낸다", () => {
    const withMark = detailQueryHref({ pathname: "/ko/photo", search: "?tag=street" }, "photo", "a");
    const without = detailQueryHref({ pathname: "/ko/photo", search: "tag=street" }, "photo", "a");

    expect(without).toBe(withMark);
  });

  it("id 가 null 이면 그 키만 지운다", () => {
    const href = detailQueryHref(
      { pathname: "/ko/photo", search: "?photo=photo-1&tag=street" },
      "photo",
      null,
    );

    expect(href).toBe("/ko/photo?tag=street");
  });

  it("남는 query 가 없으면 물음표를 붙이지 않는다", () => {
    expect(detailQueryHref({ pathname: "/ko/photo", search: "?photo=a" }, "photo", null)).toBe(
      "/ko/photo",
    );
  });

  it("hash 를 보존한다", () => {
    expect(
      detailQueryHref({ pathname: "/ko/dev", search: "", hash: "#stack" }, "project", "p-1"),
    ).toBe("/ko/dev?project=p-1#stack");
  });
});
