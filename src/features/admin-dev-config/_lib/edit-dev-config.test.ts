import { describe, expect, it } from "vitest";

import { editDevConfig } from "@/features/admin-dev-config/_lib/edit-dev-config";
import type { DevConfig } from "@/types/dev";

const config = (): DevConfig => ({
  heroLead: { ko: "개발자 소개", en: "Developer introduction" },
  interview: [
    { q: { ko: "질문 1", en: "Q1" }, a: { ko: "답변 1", en: "A1" } },
    { q: { ko: "질문 2", en: "Q2" }, a: { ko: "답변 2", en: "A2" } },
  ],
  stack: [
    {
      category: "Frontend",
      items: [{ name: "React", bg: "#61dafb", fg: "#000000" }],
    },
    {
      category: "Backend",
      items: [{ name: "Firebase", bg: "#ffca28", fg: "#000000" }],
    },
  ],
  timeline: [
    {
      period: "2025",
      title: { ko: "첫 경력", en: "First role" },
      role: { ko: "개발자", en: "Developer" },
      desc: { ko: "설명 1", en: "Description 1" },
    },
    {
      period: "2026",
      title: { ko: "둘째 경력", en: "Second role" },
      role: { ko: "개발자", en: "Developer" },
      desc: { ko: "설명 2", en: "Description 2" },
    },
  ],
});

describe("editDevConfig", () => {
  it("소개 리드의 선택한 언어만 편집한다", () => {
    const source = config();

    const edited = editDevConfig(source, {
      type: "heroLead.edit",
      lang: "en",
      value: "Updated introduction",
    });

    expect(edited.heroLead).toEqual({ ko: "개발자 소개", en: "Updated introduction" });
    expect(source.heroLead.en).toBe("Developer introduction");
  });

  it("빈 인터뷰를 추가하고 선택한 질문·답변 언어를 편집한다", () => {
    const added = editDevConfig(config(), { type: "interview.add" });
    expect(added.interview.at(-1)).toEqual({
      q: { ko: "", en: "" },
      a: { ko: "", en: "" },
    });

    const edited = editDevConfig(added, {
      type: "interview.edit",
      index: 2,
      field: "q",
      lang: "ko",
      value: "새 질문",
    });
    expect(edited.interview[2].q).toEqual({ ko: "새 질문", en: "" });
  });

  it("인터뷰를 이동하고 제거한다", () => {
    const moved = editDevConfig(config(), { type: "interview.move", index: 1, offset: -1 });
    expect(moved.interview.map(({ q }) => q.ko)).toEqual(["질문 2", "질문 1"]);

    const removed = editDevConfig(moved, { type: "interview.remove", index: 0 });
    expect(removed.interview.map(({ q }) => q.ko)).toEqual(["질문 1"]);
  });

  it("경계 밖으로 인터뷰를 이동하면 기존 배열을 유지한다", () => {
    const source = config();
    const edited = editDevConfig(source, { type: "interview.move", index: 0, offset: -1 });

    expect(edited.interview).toBe(source.interview);
  });

  it("스택 그룹을 추가하고 카테고리를 편집한다", () => {
    const added = editDevConfig(config(), { type: "stack.group.add" });
    expect(added.stack.at(-1)).toEqual({ category: "", items: [] });

    const edited = editDevConfig(added, {
      type: "stack.category.edit",
      index: 2,
      value: "Infrastructure",
    });
    expect(edited.stack[2].category).toBe("Infrastructure");
  });

  it("스택 항목을 추가·편집·제거한다", () => {
    const added = editDevConfig(config(), { type: "stack.item.add", index: 0 });
    expect(added.stack[0].items.at(-1)).toEqual({
      name: "",
      bg: "#000000",
      fg: "#ffffff",
    });

    const edited = editDevConfig(added, {
      type: "stack.item.edit",
      index: 0,
      itemIndex: 1,
      field: "name",
      value: "Next.js",
    });
    expect(edited.stack[0].items[1].name).toBe("Next.js");

    const removed = editDevConfig(edited, {
      type: "stack.item.remove",
      index: 0,
      itemIndex: 0,
    });
    expect(removed.stack[0].items.map(({ name }) => name)).toEqual(["Next.js"]);
  });

  it("스택 그룹을 이동하고 제거한다", () => {
    const moved = editDevConfig(config(), { type: "stack.group.move", index: 0, offset: 1 });
    expect(moved.stack.map(({ category }) => category)).toEqual(["Backend", "Frontend"]);

    const removed = editDevConfig(moved, { type: "stack.group.remove", index: 1 });
    expect(removed.stack.map(({ category }) => category)).toEqual(["Backend"]);
  });

  it("빈 타임라인을 추가하고 기간과 다국어 필드를 편집한다", () => {
    const added = editDevConfig(config(), { type: "timeline.add" });
    expect(added.timeline.at(-1)).toEqual({
      period: "",
      title: { ko: "", en: "" },
      role: { ko: "", en: "" },
      desc: { ko: "", en: "" },
    });

    const withPeriod = editDevConfig(added, {
      type: "timeline.period.edit",
      index: 2,
      value: "2027 — 현재",
    });
    const edited = editDevConfig(withPeriod, {
      type: "timeline.field.edit",
      index: 2,
      field: "role",
      lang: "ko",
      value: "프론트엔드 개발자",
    });

    expect(edited.timeline[2]).toMatchObject({
      period: "2027 — 현재",
      role: { ko: "프론트엔드 개발자", en: "" },
    });
  });

  it("타임라인을 이동하고 제거한다", () => {
    const moved = editDevConfig(config(), { type: "timeline.move", index: 1, offset: -1 });
    expect(moved.timeline.map(({ period }) => period)).toEqual(["2026", "2025"]);

    const removed = editDevConfig(moved, { type: "timeline.remove", index: 1 });
    expect(removed.timeline.map(({ period }) => period)).toEqual(["2026"]);
  });
});
