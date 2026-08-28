import { describe, expect, it } from "vitest";

import { deleteMessage } from "@/features/admin-shell/_lib/delete-message";

describe("deleteMessage", () => {
  it("대상 종류의 받침으로 목적격 조사를 고른다", () => {
    expect(deleteMessage({ name: "도쿄의 밤", noun: "앨범" })).toBe(
      '"도쿄의 밤" 앨범을 삭제할까요?',
    );
    expect(deleteMessage({ name: "포트폴리오", noun: "프로젝트" })).toBe(
      '"포트폴리오" 프로젝트를 삭제할까요?',
    );
  });

  it("경고가 있으면 뒤에 붙인다", () => {
    expect(deleteMessage({ name: "봄", noun: "사진", note: "되돌릴 수 없습니다." })).toBe(
      '"봄" 사진을 삭제할까요? 되돌릴 수 없습니다.',
    );
  });

  it("경고가 없으면 문장이 하나다", () => {
    // 같은 파괴 동작인데 행마다 경고 강도가 갈리던 자리다. 붙일지 말지를 호출부가 정한다.
    expect(deleteMessage({ name: "태그", noun: "태그" })).not.toContain("  ");
  });
});
