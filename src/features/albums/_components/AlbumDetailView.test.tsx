// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// 이 파일이 보는 것은 히어로 슬롯의 variant 하나뿐이다. 그리드·모달·언어 컨텍스트는
// 그 판정과 무관하고, 함께 렌더하면 실패 원인이 어디인지 흐려진다.
vi.mock("@/components/PhotoGrid", () => ({ PhotoGrid: () => null }));
vi.mock("@/features/photo-detail/_components/OnDemandPhotoModal", () => ({
  OnDemandPhotoModal: () => null,
}));
vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({ lang: "ko", dict: { albumsNav: "앨범", shareLabel: "공유하기" } }),
}));

import { AlbumDetailView } from "@/features/albums/_components/AlbumDetailView";

import type { Album } from "@/types/album";

const album = {
  id: "city-night",
  title: { ko: "도시의 밤", en: "City Night" },
  subtitle: { ko: "야경", en: "Night" },
  coverPhotoId: null,
  photoIds: [],
  order: 0,
  published: true,
} as unknown as Album;

const renderView = (coverUrl: string | null) =>
  render(<AlbumDetailView album={album} photos={[]} coverUrl={coverUrl} />);

const heroText = () => screen.getByRole("heading", { name: "도시의 밤" }).parentElement;

describe("AlbumDetailView — 히어로 글자색 variant", () => {
  afterEach(cleanup);

  it("커버가 있으면 사진 위 기준으로 그린다", () => {
    renderView("/design-samples/wide1.png");

    expect(heroText()?.dataset.variant).toBe("image");
  });

  it("커버가 없으면 지면 배경 기준으로 되돌린다", () => {
    // DetailHero 는 커버가 없을 때 scrim 을 걷고 --surface-1 을 칠한다. 제목이 흰색으로
    // 남으면 라이트 모드에서 대비가 사라져 읽히지 않는다.
    renderView(null);

    expect(heroText()?.dataset.variant).toBe("plain");
  });
});
