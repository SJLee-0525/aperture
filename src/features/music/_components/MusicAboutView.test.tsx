// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MusicAboutView } from "@/features/music/_components/MusicAboutView";

import { DICTIONARY } from "@/constants/dictionary";

type MockProps = {
  summary: string;
  body: string;
  cols: Array<{ label: string; items: string[] }>;
  stats: Array<{ label: string; value: number }>;
};

vi.mock("@/components/AboutSection", () => ({
  AboutSection: ({ summary, body, cols, stats }: MockProps) => (
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
    </>
  ),
}));

/** 작곡가는 subtitle 의 가운뎃점 앞부분이고, 두 연주의 작곡가가 같아 중복 제거 대상이다. */
const WORK_FACTS = [
  {
    subtitle: { ko: "슈베르트 · D.911", en: "Schubert · D.911" },
    venue: { ko: "예술의전당", en: "Seoul Arts Center" },
  },
  {
    subtitle: { ko: "슈베르트 · D.960", en: "Schubert · D.960" },
    venue: { ko: "예술의전당", en: "Seoul Arts Center" },
  },
  {
    subtitle: { ko: "라벨 · M.55", en: "Ravel · M.55" },
    venue: { ko: "롯데콘서트홀", en: "Lotte Concert Hall" },
  },
];

const INTRO = { ko: "요약. 본문 문장.", en: "Summary. Body sentence." };

describe("MusicAboutView", () => {
  afterEach(cleanup);

  it("ko 에서 작곡가와 무대를 중복 없이 모은다", () => {
    render(
      <MusicAboutView
        lang="ko"
        intro={INTRO}
        workFacts={WORK_FACTS}
        awardCount={3}
        mediaCount={4}
      />,
    );

    const repertoire = within(screen.getByTestId(DICTIONARY.ko.musicRepertoireLabel));
    expect(repertoire.getAllByText(/.+/).map((item) => item.textContent)).toEqual([
      "슈베르트",
      "라벨",
    ]);

    const venues = within(screen.getByTestId(DICTIONARY.ko.musicVenuesLabel));
    expect(venues.getAllByText(/.+/).map((item) => item.textContent)).toEqual([
      "예술의전당",
      "롯데콘서트홀",
    ]);
  });

  it("en 에서 같은 항목을 영어 표기로 모은다", () => {
    render(
      <MusicAboutView
        lang="en"
        intro={INTRO}
        workFacts={WORK_FACTS}
        awardCount={3}
        mediaCount={4}
      />,
    );

    const repertoire = within(screen.getByTestId(DICTIONARY.en.musicRepertoireLabel));
    expect(repertoire.getAllByText(/.+/).map((item) => item.textContent)).toEqual([
      "Schubert",
      "Ravel",
    ]);
  });

  it("통계는 연주·수상·영상 수와 중복 제거한 무대 수를 쓴다", () => {
    render(
      <MusicAboutView
        lang="en"
        intro={INTRO}
        workFacts={WORK_FACTS}
        awardCount={3}
        mediaCount={4}
      />,
    );

    expect(screen.getByTestId(`stat-${DICTIONARY.en.statWorks}`).textContent).toBe("3");
    expect(screen.getByTestId(`stat-${DICTIONARY.en.statAwards}`).textContent).toBe("3");
    expect(screen.getByTestId(`stat-${DICTIONARY.en.statVideos}`).textContent).toBe("4");
    expect(screen.getByTestId(`stat-${DICTIONARY.en.statStages}`).textContent).toBe("2");
  });

  it("intro 첫 문장을 요약으로 떼어낸다", () => {
    render(<MusicAboutView lang="en" intro={INTRO} workFacts={[]} awardCount={0} mediaCount={0} />);

    expect(screen.getByTestId("summary").textContent).toBe("Summary");
    expect(screen.getByTestId("body").textContent).toBe("Body sentence.");
  });
});
