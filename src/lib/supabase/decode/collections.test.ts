import { describe, expect, it } from "vitest";

import { decodeDevConfig, decodeDevProject } from "@/lib/supabase/decode/dev";
import { decodeDevArticle } from "@/lib/supabase/decode/dev-article";
import {
  decodeMusicAward,
  decodeMusicConfig,
  decodeMusicMedia,
  decodeMusicWork,
} from "@/lib/supabase/decode/music";
import { decodeAlbum, decodePhoto } from "@/lib/supabase/decode/photo";
import { decodeSiteConfig } from "@/lib/supabase/decode/site";

/**
 * 빈 행은 구형 문서와 첫 저장 전 상태를 함께 대표한다. 디코더가 여기서 던지거나
 * 타입이 거짓말하는 값을 돌려주면 그 뒤의 모든 화면이 알 수 없는 이유로 무너진다.
 */
const EMPTY: Record<string, unknown> = {};

describe("컬렉션 디코더 — 빈 행", () => {
  it("사진", () => {
    const photo = decodePhoto("p1", EMPTY);

    expect(photo).toEqual({
      id: "p1",
      title: { ko: "", en: "" },
      shotAt: new Date(0),
      camera: "",
      lens: "",
      exif: {
        aperture: "",
        shutter: "",
        iso: "",
        focalLength: "",
        ev: "",
        wb: "",
        metering: "",
        flash: "",
      },
      dimensions: { w: 0, h: 0 },
      aspectRatio: 1,
      place: { ko: "", en: "" },
      coords: null,
      tags: [],
      image: { url: "", path: "", w: 0, h: 0 },
      order: 0,
      published: false,
    });
    // 타입이 ImageMeta 라고 선언하는 자리에 undefined 가 오지 않는다.
    expect(photo.image).toBeDefined();
    expect("fileName" in photo).toBe(false);
  });

  it("앨범", () => {
    expect(decodeAlbum("a1", EMPTY)).toEqual({
      id: "a1",
      title: { ko: "", en: "" },
      subtitle: { ko: "", en: "" },
      coverPhotoId: "",
      cover: null,
      photoIds: [],
      order: 0,
      published: false,
    });
  });

  it("연주", () => {
    const work = decodeMusicWork("w1", EMPTY);

    expect(work.performedAt).toEqual(new Date(0));
    expect(work.poster).toEqual({ url: "", path: "", w: 0, h: 0 });
    expect(work.program).toEqual([]);
    expect(work.ticketUrl).toBe("");
  });

  it("수상·영상·음악 설정", () => {
    expect(decodeMusicAward("aw1", EMPTY).year).toBe(0);
    expect(decodeMusicMedia("m1", EMPTY).youtubeId).toBe("");
    expect(decodeMusicConfig(EMPTY)).toEqual({
      intro: { ko: "", en: "" },
      career: [],
      education: [],
    });
  });

  it("프로젝트·개발 설정", () => {
    const project = decodeDevProject("d1", EMPTY);

    expect(project.cover).toBeNull();
    expect(project.images).toEqual([]);
    expect(project.troubleshooting).toEqual([]);
    expect(decodeDevConfig(EMPTY).stack).toEqual([]);
  });

  it("글", () => {
    const article = decodeDevArticle("ar1", EMPTY);

    // 초안에서 비어 있는 것이 정상인 필드는 epoch 가 아니라 null 이어야
    // 화면의 초안 분기가 유지된다.
    expect(article.publishedAt).toBeNull();
    expect(article.firstPublishedAt).toBeNull();
    expect(article.coverAlt).toBeNull();
    expect(article.createdAt).toEqual(new Date(0));
  });

  it("사이트 설정", () => {
    expect(decodeSiteConfig(EMPTY)).toEqual({
      name: { ko: "", en: "" },
      tagline: { ko: "", en: "" },
      landingLead: { ko: "", en: "" },
      contactLead: { ko: "", en: "" },
      bio: { ko: "", en: "" },
      links: [],
      tags: [],
    });
  });
});

describe("컬렉션 디코더 — 오형 값", () => {
  it("문자열 order 는 정렬을 무너뜨리는 대신 0 이 된다", () => {
    expect(decodePhoto("p1", { order: "3" }).order).toBe(0);
    expect(decodeMusicWork("w1", { order: "3" }).order).toBe(0);
    expect(decodeDevProject("d1", { order: {} }).order).toBe(0);
  });

  it("좌표는 lat·lng 가 모두 숫자일 때만 남는다", () => {
    expect(decodePhoto("p1", { coords: { lat: 1 } }).coords).toBeNull();
    expect(decodePhoto("p1", { coords: { lat: "1", lng: "2" } }).coords).toBeNull();
    expect(decodePhoto("p1", { coords: { lat: 1, lng: 2 } }).coords).toEqual({ lat: 1, lng: 2 });
  });

  it("id 없는 태그는 사진이 참조할 수 없어 버린다", () => {
    const config = decodeSiteConfig({
      tags: [{ id: "city", ko: "도시", en: "City" }, { ko: "이름만" }, "문자열"],
    });

    expect(config.tags).toEqual([{ id: "city", ko: "도시", en: "City" }]);
  });

  it("라벨이나 주소가 문자열이 아닌 링크도 형은 유지한다", () => {
    expect(decodeSiteConfig({ links: [{ label: 1, href: null }] }).links).toEqual([
      { label: "", href: "" },
    ]);
  });

  it("저장된 예매 링크와 프로젝트 링크를 원문 그대로 읽는다", () => {
    // 읽기에서 정화하면 폼이 빈 값을 저장하고 되쓰기 경로도 원본을 지운다.
    // 공개 표시용 정화는 sanitizeForPublic 이 한다.
    expect(decodeMusicWork("w1", { ticketUrl: "http://insecure.test" }).ticketUrl).toBe(
      "http://insecure.test",
    );
    expect(decodeDevProject("d1", { links: [{ label: "L", href: "http://x.test" }] }).links).toEqual(
      [{ label: "L", href: "http://x.test" }],
    );
  });
});
