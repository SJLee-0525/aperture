// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { focusFirstIssue, issueFor } from "@/lib/admin/field-issue";

const formWith = (...fields: string[]): HTMLFormElement => {
  const form = document.createElement("form");
  for (const field of fields) {
    const input = document.createElement("input");
    input.dataset.field = field;
    form.append(input);
  }
  document.body.append(form);
  return form;
};

describe("issueFor", () => {
  it("필드 이름으로 문구를 찾는다", () => {
    const issues = [{ field: "title.ko", message: "제목(한국어)을 입력하세요." }];

    expect(issueFor(issues, "title.ko")).toBe("제목(한국어)을 입력하세요.");
  });

  it("해당 필드가 없으면 undefined 를 돌려준다", () => {
    expect(issueFor([], "title.ko")).toBeUndefined();
  });
});

describe("focusFirstIssue", () => {
  it("첫 오류 필드로 포커스를 옮긴다", () => {
    const form = formWith("title.ko", "place");
    const issues = [
      { field: "place", message: "장소" },
      { field: "title.ko", message: "제목" },
    ];

    expect(focusFirstIssue(form, issues)).toBe(true);
    expect((document.activeElement as HTMLInputElement).dataset.field).toBe("place");
  });

  it("오류가 없으면 아무것도 하지 않는다", () => {
    expect(focusFirstIssue(formWith("title.ko"), [])).toBe(false);
  });

  it("화면에 없는 필드면 포커스를 옮기지 않는다", () => {
    const form = formWith("title.ko");

    expect(focusFirstIssue(form, [{ field: "missing", message: "" }])).toBe(false);
  });

  it("점이 든 필드 이름도 선택자로 안전하게 쓴다", () => {
    const form = formWith("exif.iso");

    expect(focusFirstIssue(form, [{ field: "exif.iso", message: "" }])).toBe(true);
  });
});
