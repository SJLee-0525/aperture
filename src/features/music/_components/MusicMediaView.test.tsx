// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MusicMediaView } from "@/features/music/_components/MusicMediaView";

import type { MusicMedia } from "@/types/music";

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({ lang: "ko", dict: { musicMediaNav: "영상", comingSoon: "곧 공개" } }),
}));

const media = (id: string, youtubeId: string): MusicMedia => ({
  id,
  title: { ko: `${id} 연주`, en: `${id} performance` },
  source: { ko: "예술의전당", en: "Seoul Arts Center" },
  youtubeId,
  order: 0,
  published: true,
});

describe("MusicMediaView", () => {
  afterEach(cleanup);

  it("한 번에 하나의 영상만 재생한다", () => {
    render(
      <MusicMediaView media={[media("first", "kX3nB7dQ2Ls"), media("second", "aB1cD2eF3Gh")]} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "first 연주" }));
    expect(document.querySelectorAll("iframe")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "second 연주" }));
    const frames = document.querySelectorAll("iframe");
    expect(frames).toHaveLength(1);
    expect(frames[0].getAttribute("src")).toContain("aB1cD2eF3Gh");
  });

  it("영상 ID 가 없는 항목은 누르면 출처 자리에 안내를 보여 준다", () => {
    render(<MusicMediaView media={[media("pending", "")]} />);

    expect(screen.getByText("예술의전당")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "pending 연주" }));

    expect(screen.getByText("곧 공개")).toBeTruthy();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("영상이 없으면 안내 문구만 보여 준다", () => {
    render(<MusicMediaView media={[]} />);

    expect(screen.getByText("곧 공개")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
