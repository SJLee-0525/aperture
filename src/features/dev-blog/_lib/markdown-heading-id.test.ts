import { describe, expect, it } from "vitest";

import {
  createHeadingIdFactory,
  toHeadingSlug,
} from "@/features/dev-blog/_lib/markdown-heading-id";

describe("toHeadingSlug", () => {
  it("한글 제목의 글자를 지우지 않는다", () => {
    expect(toHeadingSlug("보안 경계는 Rules 하나")).toBe("보안-경계는-rules-하나");
  });

  it("연속된 기호를 하나의 하이픈으로 줄이고 양끝을 다듬는다", () => {
    expect(toHeadingSlug("  Next.js — App Router!  ")).toBe("next-js-app-router");
  });

  it("남는 글자가 없으면 기본값을 쓴다", () => {
    expect(toHeadingSlug("🎧 — ⚙️")).toBe("section");
    expect(toHeadingSlug("")).toBe("section");
  });
});

describe("createHeadingIdFactory", () => {
  it("같은 제목이 다시 나오면 문서 순서대로 번호를 붙인다", () => {
    const nextId = createHeadingIdFactory();

    expect(nextId("정리")).toBe("정리");
    expect(nextId("남은 일")).toBe("남은-일");
    expect(nextId("정리")).toBe("정리-2");
    expect(nextId("정리")).toBe("정리-3");
  });

  it("붙인 번호가 다른 제목의 slug 와 부딪히면 다음 번호로 넘어간다", () => {
    // 등장 횟수만 세면 두 번째 `정리` 가 `정리 2` 와 같은 id 를 받아 목차와 fragment 가
    // 같은 곳을 가리킨다. 발급한 id 를 기억해야 이 입력이 세 개의 서로 다른 id 로 갈린다.
    const nextId = createHeadingIdFactory();

    expect(nextId("정리")).toBe("정리");
    expect(nextId("정리 2")).toBe("정리-2");
    expect(nextId("정리")).toBe("정리-3");
  });

  it("문서마다 새 factory 를 만들면 번호가 이어지지 않는다", () => {
    expect(createHeadingIdFactory()("정리")).toBe("정리");
    expect(createHeadingIdFactory()("정리")).toBe("정리");
  });
});
