// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { focusFirstIssue, issueFor } from "@/lib/admin/field-issue";

const formWith = (fields: string[]): HTMLFormElement => {
  const form = document.createElement("form");
  for (const field of fields) {
    const button = document.createElement("button");
    button.dataset.field = field;
    form.append(button);
  }
  document.body.append(form);
  return form;
};

describe("focusFirstIssue", () => {
  it("첫 오류의 필드로 포커스를 옮긴다", () => {
    const form = formWith(["image", "title.ko"]);

    const moved = focusFirstIssue(form, [
      { field: "image", message: "이미지를 먼저 업로드하세요." },
      { field: "title.ko", message: "제목(한국어)을 입력하세요." },
    ]);

    expect(moved).toBe(true);
    expect((document.activeElement as HTMLElement).dataset.field).toBe("image");
  });

  it("대상 컨트롤이 없으면 옮기지 못했다고 알린다", () => {
    // 이 false 가 곧 "저장은 막혔는데 화면에 아무 표시도 없다" 는 상태다.
    const form = formWith(["title.ko"]);

    expect(focusFirstIssue(form, [{ field: "image", message: "이미지" }])).toBe(false);
  });

  it("이슈가 없으면 아무것도 하지 않는다", () => {
    expect(focusFirstIssue(formWith(["title.ko"]), [])).toBe(false);
    expect(focusFirstIssue(null, [{ field: "title.ko", message: "제목" }])).toBe(false);
  });
});

describe("issueFor", () => {
  it("필드 이름으로 문구를 찾는다", () => {
    const issues = [{ field: "photoIds", message: "사진을 고르세요." }];

    expect(issueFor(issues, "photoIds")).toBe("사진을 고르세요.");
    expect(issueFor(issues, "title.ko")).toBeUndefined();
  });
});
