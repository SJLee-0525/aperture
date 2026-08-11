import { describe, expect, it } from "vitest";

import {
  ALL,
  buildPhotoFilterHref,
  FOCAL_MAX,
  FOCAL_MIN,
  parsePhotoFilterQuery,
  parsePhotoFilterQueryStrict,
} from "@/lib/photo-filter-query";

import type { Tag } from "@/types/tag";

const TAGS: Tag[] = [
  { id: "sea", ko: "바다", en: "Sea" },
  { id: "night", ko: "밤", en: "Night" },
];
const CAMERAS = ["Sony α7 IV", "Leica Q3"];
const VOCAB = { tags: TAGS, cameras: CAMERAS };
const DEFAULTS = { tag: ALL, camera: ALL, focalMin: FOCAL_MIN, focalMax: FOCAL_MAX };

const params = (query: string) => new URLSearchParams(query);

describe("parsePhotoFilterQuery (관대 — 주소창 URL)", () => {
  it("정상 값을 파싱한다", () => {
    expect(
      parsePhotoFilterQuery(params("tag=sea&camera=Leica+Q3&focalMin=24&focalMax=70"), VOCAB),
    ).toEqual({
      tag: "sea",
      camera: "Leica Q3",
      focalMin: 24,
      focalMax: 70,
    });
  });

  it("한글·영문 라벨과 id를 같은 태그 id로 정규화한다 (대소문자 무시)", () => {
    for (const raw of ["sea", "Sea", "바다", "SEA"]) {
      expect(parsePhotoFilterQuery(params(`tag=${encodeURIComponent(raw)}`), VOCAB).tag).toBe(
        "sea",
      );
    }
  });

  it("카메라는 정확 일치 우선, 유일 부분 일치 허용, 중의적이면 기본값", () => {
    expect(parsePhotoFilterQuery(params("camera=leica"), VOCAB).camera).toBe("Leica Q3");
    expect(parsePhotoFilterQuery(params("camera=nonexistent"), VOCAB).camera).toBe(ALL);
    // 빈 문자열은 모든 카메라에 부분 일치 → 중의적 → 기본값.
    expect(parsePhotoFilterQuery(params("camera="), VOCAB).camera).toBe(ALL);
  });

  it("알 수 없는 태그·범위 밖·NaN 초점거리는 기본값으로 되돌린다", () => {
    expect(parsePhotoFilterQuery(params("tag=zzz"), VOCAB).tag).toBe(ALL);
    expect(parsePhotoFilterQuery(params("focalMin=abc"), VOCAB).focalMin).toBe(FOCAL_MIN);
    expect(parsePhotoFilterQuery(params("focalMin=1"), VOCAB).focalMin).toBe(FOCAL_MIN);
    expect(parsePhotoFilterQuery(params("focalMax=9999"), VOCAB).focalMax).toBe(FOCAL_MAX);
    // clamp가 아니라 기본값 복귀 — 반대 방향 경계로 clamp되면 임의 범위가 살아난다.
    expect(parsePhotoFilterQuery(params("focalMin=9999"), VOCAB).focalMin).toBe(FOCAL_MIN);
    expect(parsePhotoFilterQuery(params("focalMax=1"), VOCAB).focalMax).toBe(FOCAL_MAX);
  });

  it("역전된 초점 범위는 스왑하지 않고 둘 다 기본값으로 복귀한다", () => {
    expect(parsePhotoFilterQuery(params("focalMin=200&focalMax=35"), VOCAB)).toEqual(DEFAULTS);
  });

  it("중복 파라미터는 첫 값을 사용하고 unknown key는 무시한다", () => {
    const state = parsePhotoFilterQuery(params("tag=sea&tag=night&redirect=https://evil"), VOCAB);
    expect(state.tag).toBe("sea");
  });
});

describe("parsePhotoFilterQueryStrict (엄격 — 챗봇 링크·요청 문맥)", () => {
  it("정상 query를 canonical 상태로 해석한다", () => {
    expect(
      parsePhotoFilterQueryStrict(
        params("tag=Sea&camera=leica&focalMin=24&q=%EC%84%A4%EC%9B%90"),
        VOCAB,
      ),
    ).toEqual({
      state: { tag: "sea", camera: "Leica Q3", focalMin: 24, focalMax: FOCAL_MAX },
      q: "설원",
      photoId: null,
    });
  });

  it("unknown key가 하나라도 있으면 전체 거부 — 제거 후 통과시키지 않는다", () => {
    expect(parsePhotoFilterQueryStrict(params("redirect=https://evil.example"), VOCAB)).toBeNull();
    expect(
      parsePhotoFilterQueryStrict(params("tag=sea&redirect=https://evil.example"), VOCAB),
    ).toBeNull();
  });

  it("중복된 known key도 전체 거부한다", () => {
    expect(parsePhotoFilterQueryStrict(params("tag=sea&tag=night"), VOCAB)).toBeNull();
    expect(parsePhotoFilterQueryStrict(params("q=a&q=b"), VOCAB)).toBeNull();
    expect(parsePhotoFilterQueryStrict(params("photo=a&photo=b"), VOCAB)).toBeNull();
  });

  it("인식된 key가 하나도 없는 query는 거부한다", () => {
    expect(parsePhotoFilterQueryStrict(params(""), VOCAB)).toBeNull();
  });

  it("잘못된 값은 기본값 복귀가 아니라 전체 거부다", () => {
    expect(parsePhotoFilterQueryStrict(params("tag=zzz"), VOCAB)).toBeNull();
    expect(parsePhotoFilterQueryStrict(params("camera=nonexistent"), VOCAB)).toBeNull();
    expect(parsePhotoFilterQueryStrict(params("focalMin=abc"), VOCAB)).toBeNull();
    expect(parsePhotoFilterQueryStrict(params("focalMin=1"), VOCAB)).toBeNull();
    expect(parsePhotoFilterQueryStrict(params("focalMin=-24"), VOCAB)).toBeNull();
    expect(parsePhotoFilterQueryStrict(params("focalMin=200&focalMax=35"), VOCAB)).toBeNull();
    expect(parsePhotoFilterQueryStrict(params("q="), VOCAB)).toBeNull();
    expect(parsePhotoFilterQueryStrict(params(`q=${"a".repeat(101)}`), VOCAB)).toBeNull();
  });

  it("photoIds가 주어지면 photo id 존재를 검증하고, 없으면 형식만 검증한다", () => {
    const withIds = { ...VOCAB, photoIds: ["p01", "p02"] };
    expect(parsePhotoFilterQueryStrict(params("photo=p01"), withIds)?.photoId).toBe("p01");
    expect(parsePhotoFilterQueryStrict(params("photo=zzz"), withIds)).toBeNull();
    expect(parsePhotoFilterQueryStrict(params("photo=zzz"), VOCAB)?.photoId).toBe("zzz");
    expect(parsePhotoFilterQueryStrict(params(`photo=${"a".repeat(65)}`), VOCAB)).toBeNull();
  });
});

describe("buildPhotoFilterHref (canonical 직렬화)", () => {
  it("q, tag, camera, focalMin, focalMax, photo 순서로 고정한다", () => {
    const href = buildPhotoFilterHref(
      "/photo",
      { tag: "sea", camera: "Leica Q3", focalMin: 24, focalMax: 70 },
      { q: "설원", photo: "p01" },
    );
    expect(href).toBe(
      "/photo?q=%EC%84%A4%EC%9B%90&tag=sea&camera=Leica+Q3&focalMin=24&focalMax=70&photo=p01",
    );
  });

  it("기본값과 빈값은 생략하고, 전부 기본이면 pathname만 반환한다", () => {
    expect(buildPhotoFilterHref("/photo", DEFAULTS, { q: "  ", photo: null })).toBe("/photo");
    expect(buildPhotoFilterHref("/photo", { ...DEFAULTS, focalMax: 70 })).toBe(
      "/photo?focalMax=70",
    );
  });

  it("strict 파싱 결과를 다시 직렬화하면 canonical로 정규화된다 (Sea→sea, 순서 재정렬)", () => {
    const parsed = parsePhotoFilterQueryStrict(params("camera=leica&tag=Sea&focalMax=70"), VOCAB);
    expect(parsed).not.toBeNull();
    const href = buildPhotoFilterHref("/photo", parsed!.state, {
      q: parsed!.q,
      photo: parsed!.photoId,
    });
    expect(href).toBe("/photo?tag=sea&camera=Leica+Q3&focalMax=70");
  });

  it("parse→build 왕복은 멱등이다", () => {
    const query = "q=dawn&tag=night&focalMin=35&photo=p02";
    const parsed = parsePhotoFilterQueryStrict(params(query), VOCAB)!;
    const href = buildPhotoFilterHref("/photo", parsed.state, {
      q: parsed.q,
      photo: parsed.photoId,
    });
    const again = parsePhotoFilterQueryStrict(new URLSearchParams(href.split("?")[1]), VOCAB)!;
    expect(again).toEqual(parsed);
  });
});
