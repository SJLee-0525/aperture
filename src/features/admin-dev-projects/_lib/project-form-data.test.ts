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

  it("label이나 href 중 하나라도 있는 링크를 보존한다", () => {
    const form = {
      ...emptyProjectInput(),
      links: [
        { label: "GitHub", href: "" },
        { label: "", href: "https://example.com" },
        { label: "  ", href: "\t" },
      ],
    };

    expect(prepareProjectInput(form).links).toEqual(form.links.slice(0, 2));
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
