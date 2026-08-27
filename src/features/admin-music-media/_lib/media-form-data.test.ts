import { describe, expect, it } from "vitest";

import {
  emptyMediaInput,
  mediaToInput,
  prepareMediaInput,
} from "@/features/admin-music-media/_lib/media-form-data";

import type { MusicMedia } from "@/types/music";

describe("mediaToInput", () => {
  it("기존 영상에서 문서 id 만 제외한다", () => {
    const media: MusicMedia = {
      id: "m1",
      title: { ko: "실황", en: "Live" },
      source: { ko: "", en: "" },
      youtubeId: "abc",
      order: 1,
      published: true,
    };

    expect(mediaToInput(media)).toEqual(
      Object.fromEntries(Object.entries(media).filter(([key]) => key !== "id")),
    );
  });
});

describe("prepareMediaInput", () => {
  it("YouTube ID 의 앞뒤 공백을 턴다", () => {
    expect(prepareMediaInput({ ...emptyMediaInput(), youtubeId: "  abc  " }).youtubeId).toBe("abc");
  });
});
