// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DevAboutView } from "@/features/dev/_components/DevAboutView";

import { DICTIONARY } from "@/constants/dictionary";

import type { ReactNode } from "react";

type MockProps = {
  summary: string;
  body: string;
  cols: Array<{ label: string; items: string[] }>;
  stats: Array<{ label: string; value: number }>;
  children?: ReactNode;
};

vi.mock("@/components/AboutSection", () => ({
  AboutSection: ({ summary, body, cols, stats, children }: MockProps) => (
    <>
      <div data-testid="summary">{summary}</div>
      <div data-testid="body">{body}</div>
      {cols.map((col) => (
        <div key={col.label} data-testid={col.label}>
          {col.items.map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      ))}
      {stats.map((stat) => (
        <div key={stat.label} data-testid={`stat-${stat.label}`}>
          {stat.value}
        </div>
      ))}
      <div data-testid="children">{children}</div>
    </>
  ),
}));

const HERO_LEAD = { ko: "요약. 본문 문장.", en: "Summary. Body sentence." };

/** 두 그룹 합쳐 항목 3개 — statStack 은 그룹 수가 아니라 항목 수를 센다. */
const STACK = [
  {
    category: "Frontend",
    items: [
      { name: "Next.js", bg: "#000", fg: "#fff" },
      { name: "React", bg: "#000", fg: "#fff" },
    ],
  },
  { category: "Backend", items: [{ name: "Supabase", bg: "#000", fg: "#fff" }] },
];

/** 두 프로젝트가 React 를 공유해 중복 제거 후 3개가 남는다. */
const PROJECT_TECH_TAGS = [
  ["React", "TypeScript"],
  ["React", "CSS Modules"],
];

const INTERVIEW = [
  { q: { ko: "질문 하나", en: "First question" }, a: { ko: "답변 하나", en: "First answer" } },
];

describe("DevAboutView", () => {
  afterEach(cleanup);

  it("프로젝트 기술 태그를 중복 없이 모으고 스택 항목 수를 센다", () => {
    render(
      <DevAboutView
        lang="en"
        heroLead={HERO_LEAD}
        stack={STACK}
        interview={INTERVIEW}
        timelineCount={5}
        projectTechTags={PROJECT_TECH_TAGS}
      />,
    );

    const tech = within(screen.getByTestId(DICTIONARY.en.devTechLabel));
    expect(tech.getAllByText(/.+/).map((item) => item.textContent)).toEqual([
      "React",
      "TypeScript",
      "CSS Modules",
    ]);

    expect(screen.getByTestId(`stat-${DICTIONARY.en.statProjects}`).textContent).toBe("2");
    expect(screen.getByTestId(`stat-${DICTIONARY.en.statStack}`).textContent).toBe("3");
    expect(screen.getByTestId(`stat-${DICTIONARY.en.statCareer}`).textContent).toBe("5");
    expect(screen.getByTestId(`stat-${DICTIONARY.en.statTags}`).textContent).toBe("3");
  });

  it("스택 컬럼에는 카테고리 이름만 넣는다", () => {
    render(
      <DevAboutView
        lang="ko"
        heroLead={HERO_LEAD}
        stack={STACK}
        interview={INTERVIEW}
        timelineCount={0}
        projectTechTags={[]}
      />,
    );

    const stackCol = within(screen.getByTestId(DICTIONARY.ko.devStackLabel));
    expect(stackCol.getAllByText(/.+/).map((item) => item.textContent)).toEqual([
      "Frontend",
      "Backend",
    ]);
  });

  it("인터뷰 Q&A 를 현재 언어로 children 슬롯에 렌더한다", () => {
    render(
      <DevAboutView
        lang="en"
        heroLead={HERO_LEAD}
        stack={STACK}
        interview={INTERVIEW}
        timelineCount={0}
        projectTechTags={[]}
      />,
    );

    const qa = within(screen.getByTestId("children"));
    expect(qa.getByText("First question")).toBeTruthy();
    expect(qa.getByText("First answer")).toBeTruthy();
  });

  it("heroLead 첫 문장을 요약으로 떼어낸다", () => {
    render(
      <DevAboutView
        lang="en"
        heroLead={HERO_LEAD}
        stack={[]}
        interview={[]}
        timelineCount={0}
        projectTechTags={[]}
      />,
    );

    expect(screen.getByTestId("summary").textContent).toBe("Summary");
    expect(screen.getByTestId("body").textContent).toBe("Body sentence.");
  });
});
