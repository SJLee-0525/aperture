import { describe, expect, it } from "vitest";

import {
  emptyProjectInput,
  prepareProjectInput,
} from "@/features/admin-dev-projects/_lib/project-form-data";

describe("prepareProjectInput", () => {
  it("저장 전에 빈 목록 항목을 제거하고 기술 태그를 정리한다", () => {
    const form = {
      ...emptyProjectInput(),
      features: [
        { ko: "검색", en: "" },
        { ko: "  ", en: "" },
      ],
      roles: [
        { ko: "", en: "Frontend" },
        { ko: "", en: "" },
      ],
      achievements: [
        { ko: "LCP 개선", en: "" },
        { ko: "\t", en: "\n" },
      ],
      techTags: [" React ", "", "   ", "Next.js"],
    };

    const prepared = prepareProjectInput(form);

    expect(prepared.features).toEqual([{ ko: "검색", en: "" }]);
    expect(prepared.roles).toEqual([{ ko: "", en: "Frontend" }]);
    expect(prepared.achievements).toEqual([{ ko: "LCP 개선", en: "" }]);
    expect(prepared.techTags).toEqual(["React", "Next.js"]);
  });

  it("완성된 안전한 링크만 정리해 보존한다", () => {
    const form = {
      ...emptyProjectInput(),
      links: [
        { label: " GitHub ", href: " https://example.com " },
        { label: "  ", href: "\t" },
      ],
    };

    expect(prepareProjectInput(form).links).toEqual([
      { label: "GitHub", href: "https://example.com" },
    ]);
  });

  it("불완전하거나 실행 가능한 링크를 저장하지 않는다", () => {
    expect(() =>
      prepareProjectInput({
        ...emptyProjectInput(),
        links: [{ label: "GitHub", href: "" }],
      }),
    ).toThrow("1번째 링크");
    expect(() =>
      prepareProjectInput({
        ...emptyProjectInput(),
        links: [{ label: "위험", href: "javascript:alert(1)" }],
      }),
    ).toThrow("1번째 링크");
  });

  it("모든 내용이 빈 troubleshooting 항목을 제거한다", () => {
    const form = {
      ...emptyProjectInput(),
      troubleshooting: [
        {
          title: { ko: "", en: "" },
          problem: { ko: "  ", en: "" },
          solution: { ko: "", en: "" },
        },
        {
          title: { ko: "렌더링 병목", en: "" },
          problem: { ko: "", en: "" },
          solution: { ko: "", en: "" },
        },
      ],
    };

    expect(prepareProjectInput(form).troubleshooting).toEqual([form.troubleshooting[1]]);
  });

  it("내용 없는 선택적 result 필드를 제거한다", () => {
    const form = {
      ...emptyProjectInput(),
      troubleshooting: [
        {
          title: { ko: "문제", en: "" },
          problem: { ko: "", en: "" },
          solution: { ko: "", en: "" },
          result: { ko: " ", en: "" },
        },
      ],
    };

    expect(prepareProjectInput(form).troubleshooting[0]).not.toHaveProperty("result");
  });

  it("정리 과정에서 원본 폼과 중첩 배열을 변경하지 않는다", () => {
    const form = {
      ...emptyProjectInput(),
      features: [{ ko: "기능", en: "" }],
      techTags: [" React "],
    };
    const original = structuredClone(form);

    const prepared = prepareProjectInput(form);

    expect(form).toEqual(original);
    expect(prepared).not.toBe(form);
    expect(prepared.features).not.toBe(form.features);
    expect(prepared.techTags).not.toBe(form.techTags);
  });
});
