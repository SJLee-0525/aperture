import { describe, expect, it } from "vitest";

import {
  projectedPublishedOrderedQuery,
  publishedOrderedQuery,
  publishedQuery,
} from "@/lib/firebase/public/transport";

describe("publishedQuery", () => {
  it("다중 정렬을 나열 순서 그대로 구조화 쿼리에 옮긴다", () => {
    expect(
      publishedQuery("devArticles", [
        { fieldPath: "publishedAt", direction: "DESCENDING" },
        { fieldPath: "__name__", direction: "ASCENDING" },
      ]),
    ).toEqual({
      from: [{ collectionId: "devArticles" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "published" },
          op: "EQUAL",
          value: { booleanValue: true },
        },
      },
      orderBy: [
        { field: { fieldPath: "publishedAt" }, direction: "DESCENDING" },
        { field: { fieldPath: "__name__" }, direction: "ASCENDING" },
      ],
    });
  });

  it("select 를 주면 그 필드만 담고, 생략하면 select 키 자체가 없다", () => {
    const projected = publishedQuery(
      "devArticles",
      [{ fieldPath: "publishedAt", direction: "DESCENDING" }],
      ["slug", "title"],
    );
    expect(projected.select).toEqual({ fields: [{ fieldPath: "slug" }, { fieldPath: "title" }] });

    const full = publishedQuery("devArticles", [
      { fieldPath: "publishedAt", direction: "DESCENDING" },
    ]);
    expect("select" in full).toBe(false);
  });
});

describe("기존 order asc wrapper 무회귀", () => {
  // 기존 6개 컬렉션 호출부가 받는 JSON — builder 일반화 이전 구조와 바이트 단위로 같아야
  // Firestore 쿼리 계획과 캐시 키가 흔들리지 않는다.
  it("publishedOrderedQuery 산출이 일반화 이전 구조와 동일하다", () => {
    expect(publishedOrderedQuery("photos")).toEqual({
      from: [{ collectionId: "photos" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "published" },
          op: "EQUAL",
          value: { booleanValue: true },
        },
      },
      orderBy: [{ field: { fieldPath: "order" }, direction: "ASCENDING" }],
    });
  });

  it("projectedPublishedOrderedQuery 는 같은 쿼리에 select 만 더한다", () => {
    expect(projectedPublishedOrderedQuery("devProjects", ["title", "order"])).toEqual({
      ...publishedOrderedQuery("devProjects"),
      select: { fields: [{ fieldPath: "title" }, { fieldPath: "order" }] },
    });
  });
});
