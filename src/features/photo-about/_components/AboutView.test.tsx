// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AboutView } from "@/features/photo-about/_components/AboutView";

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
      {/* 통계 라벨은 목록 라벨과 문자열이 겹칠 수 있어(ko "카메라") testid 를 접두사로 나눈다. */}
      {stats.map((stat) => (
        <div key={stat.label} data-testid={`stat-${stat.label}`}>
          {stat.value}
        </div>
      ))}
    </>
  ),
}));

/** 세 사진의 촬영지 — 도시가 둘(도쿄·서울)이라 도시만 추출해야 2가 된다. */
const PLACES = [
  { ko: "도쿄 미나토구", en: "Minato, Tokyo" },
  { ko: "도쿄 시부야구", en: "Shibuya, Tokyo" },
  { ko: "서울", en: "Seoul" },
];

const factsWithPlaces = () => PLACES.map((place) => ({ camera: "Camera", lens: "Lens", place }));

describe("AboutView", () => {
  afterEach(cleanup);

  it("빈 값과 공백뿐인 렌즈를 목록에서 제거한다", () => {
    const place = { ko: "서울", en: "Seoul" };

    render(
      <AboutView
        lang="ko"
        bio={{ ko: "소개", en: "About" }}
        albumCount={0}
        photoFacts={[
          { camera: "Camera", lens: "RF24-70mm F2.8 L IS USM", place },
          { camera: "Camera", lens: "", place },
          { camera: "Camera", lens: "   ", place },
          { camera: "Camera", lens: " VOIGTLANDER NOKTON 35mm F1.2 ", place },
        ]}
      />,
    );

    const lensList = within(screen.getByTestId(DICTIONARY.ko.lensLabel));
    expect(lensList.getAllByText(/.+/).map((item) => item.textContent)).toEqual([
      "RF24-70mm F2.8 L IS USM",
      "VOIGTLANDER NOKTON 35mm F1.2",
    ]);
  });

  it("ko 촬영지는 첫 어절을 도시로 본다", () => {
    render(
      <AboutView
        lang="ko"
        bio={{ ko: "소개", en: "About" }}
        albumCount={0}
        photoFacts={factsWithPlaces()}
      />,
    );

    expect(screen.getByTestId(`stat-${DICTIONARY.ko.statLocations}`).textContent).toBe("2");
  });

  it("en 촬영지는 마지막 쉼표 조각을 도시로 본다", () => {
    render(
      <AboutView
        lang="en"
        bio={{ ko: "소개", en: "About" }}
        albumCount={0}
        photoFacts={factsWithPlaces()}
      />,
    );

    expect(screen.getByTestId(`stat-${DICTIONARY.en.statLocations}`).textContent).toBe("2");
  });

  it("bio 첫 문장을 요약으로 떼어내고 나머지를 본문으로 남긴다", () => {
    render(
      <AboutView
        lang="en"
        bio={{ ko: "요약. 본문 문장.", en: "Summary. Body sentence." }}
        albumCount={0}
        photoFacts={[]}
      />,
    );

    expect(screen.getByTestId("summary").textContent).toBe("Summary");
    expect(screen.getByTestId("body").textContent).toBe("Body sentence.");
  });

  it("문장 구분이 없는 bio 는 전체를 요약으로 쓰고 본문을 비운다", () => {
    render(
      <AboutView lang="ko" bio={{ ko: "한 문장뿐", en: "One" }} albumCount={0} photoFacts={[]} />,
    );

    expect(screen.getByTestId("summary").textContent).toBe("한 문장뿐");
    expect(screen.getByTestId("body").textContent).toBe("");
  });
});
