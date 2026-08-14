// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DetailHero } from "@/components/DetailHero";

const BACK = { href: "/ko/photo/albums", label: "앨범" };
const SHARE = { title: "도시의 밤", label: "공유하기" };

describe("DetailHero", () => {
  afterEach(cleanup);

  it("커버가 있으면 배경 이미지와 복귀·공유 버튼을 함께 그린다", () => {
    render(
      <DetailHero
        cover={{ url: "/design-samples/wide1.png", alt: "커버" }}
        back={BACK}
        share={SHARE}
      >
        <h1>도시의 밤</h1>
      </DetailHero>,
    );

    expect(screen.getByRole("img", { name: "커버" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /앨범/ }).getAttribute("href")).toBe(
      "/ko/photo/albums",
    );
    expect(screen.getByRole("button", { name: "공유하기" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "도시의 밤" })).toBeTruthy();
  });

  it("커버가 없으면 이미지 없이 타이포그래피형으로 바뀐다", () => {
    const { container } = render(
      <DetailHero cover={null} back={BACK} share={SHARE}>
        <h1>제목만</h1>
      </DetailHero>,
    );

    expect(screen.queryByRole("img")).toBeNull();
    expect(container.firstElementChild?.getAttribute("data-variant")).toBe("plain");
    // 이미지가 없으면 우클릭 보호 표식도 필요 없다.
    expect(container.firstElementChild?.hasAttribute("data-protected-image")).toBe(false);
  });

  it("최소 높이를 지면마다 다르게 줄 수 있다", () => {
    const { container } = render(
      <DetailHero cover={null} back={BACK} share={SHARE} minHeight={360}>
        <h1>제목</h1>
      </DetailHero>,
    );

    expect(container.firstElementChild?.getAttribute("style")).toContain(
      "--detail-hero-min-height: 360px",
    );
  });
});
