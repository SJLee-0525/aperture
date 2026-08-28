import type { Tag } from "@/types/tag";

/** 태그·카메라 필터의 "전체" 센티넬 (특정 태그 id와 겹치지 않는 값) */
const ALL = "__all__";
/** 초점거리 슬라이더 범위 (mm) */
const FOCAL_MIN = 16;
const FOCAL_MAX = 300;

/** URL에서 허용하는 query key. 배열 순서는 canonical 직렬화 순서와 같다. */
const KNOWN_KEYS = ["q", "tag", "camera", "focalMin", "focalMax", "photo"] as const;

const MAX_QUERY_CHARS = 100;
const MAX_PHOTO_ID_CHARS = 64;

/** 검색어를 제외한 사진 그리드 필터 상태. `q`는 검색 UI에서 관리한다. */
type PhotoFilterState = {
  tag: string;
  camera: string;
  focalMin: number;
  focalMax: number;
};

/** 필터 값을 검증할 공개 태그와 카메라 목록. */
type PhotoFilterVocabulary = {
  tags: Tag[];
  cameras: readonly string[];
  /** 값이 있으면 strict 파서가 `photo` id의 존재도 확인한다. */
  photoIds?: readonly string[];
};

const DEFAULT_FILTER_STATE: PhotoFilterState = {
  tag: ALL,
  camera: ALL,
  focalMin: FOCAL_MIN,
  focalMax: FOCAL_MAX,
};

/**
 * 태그 id와 ko/en 라벨을 대소문자 구분 없이 조회한다.
 *
 * @param tags site/config 의 통제 태그 사전.
 * @param raw URL·에이전트가 넘긴 태그 값.
 * @returns 매칭 실패 시 null.
 */
const resolveTag = (tags: Tag[], raw: string): Tag | null => {
  const needle = raw.trim().toLowerCase();
  return (
    tags.find(
      (tag) =>
        tag.id.toLowerCase() === needle ||
        tag.ko.toLowerCase() === needle ||
        tag.en.toLowerCase() === needle,
    ) ?? null
  );
};

/**
 * 카메라 이름을 조회한다. 정확히 일치하는 이름을 우선하며 부분 일치는 후보가 하나일 때만 허용한다.
 *
 * @param cameras 공개 사진에서 파생한 카메라명 목록.
 * @param raw URL·에이전트가 넘긴 카메라 값.
 * @returns 매칭 실패·중의적 부분 일치 시 null.
 */
const resolveCamera = (cameras: readonly string[], raw: string): string | null => {
  const needle = raw.trim().toLowerCase();
  const exact = cameras.find((camera) => camera.toLowerCase() === needle);
  if (exact) return exact;
  const partial = cameras.filter((camera) => camera.toLowerCase().includes(needle));
  return partial.length === 1 ? (partial[0] ?? null) : null;
};

/**
 * 브라우저 URL을 관대하게 파싱한다. 잘못된 값은 기본값으로 바꾸고 알 수 없는 key는
 * 무시한다. 같은 key가 여러 번 나오면 첫 값을 쓴다.
 */
const parsePhotoFilterQuery = (
  searchParams: URLSearchParams,
  vocabulary: PhotoFilterVocabulary,
): PhotoFilterState => {
  const rawTag = searchParams.get("tag");
  const rawCamera = searchParams.get("camera");
  const tag = rawTag ? (resolveTag(vocabulary.tags, rawTag)?.id ?? ALL) : ALL;
  const camera = rawCamera ? (resolveCamera(vocabulary.cameras, rawCamera) ?? ALL) : ALL;

  const parseFocal = (raw: string | null, fallback: number): number => {
    if (raw === null || !raw.trim()) return fallback;
    // 엄격 파서(parseStrictPhotoFilterQuery)와 같은 규칙을 쓴다. Number 는 "0x20"·"1e2" 도
    // 받아들여, 직접 진입한 URL 과 챗봇이 만든 링크가 같은 값에 다른 결과를 낸다.
    if (!/^\d+$/.test(raw.trim())) return fallback;
    const value = Number(raw.trim());
    if (!Number.isFinite(value)) return fallback;
    // clamp하면 focalMin=9999가 300으로 남으므로 범위 밖 값에는 기본값을 쓴다.
    return value >= FOCAL_MIN && value <= FOCAL_MAX ? value : fallback;
  };
  let focalMin = parseFocal(searchParams.get("focalMin"), FOCAL_MIN);
  let focalMax = parseFocal(searchParams.get("focalMax"), FOCAL_MAX);
  // 역전된 범위는 두 값을 모두 기본값으로 되돌린다.
  if (focalMin > focalMax) {
    focalMin = FOCAL_MIN;
    focalMax = FOCAL_MAX;
  }

  return { tag, camera, focalMin, focalMax };
};

/**
 * 챗봇 링크처럼 신뢰할 수 없는 query를 엄격하게 파싱한다. 알 수 없거나 중복된 key,
 * 잘못된 값, 역전된 범위, 빈 query를 만나면 전체를 거부한다. photoIds가 있으면 사진
 * id의 존재도 확인한다.
 */
const parsePhotoFilterQueryStrict = (
  searchParams: URLSearchParams,
  vocabulary: PhotoFilterVocabulary,
): { state: PhotoFilterState; q: string | null; photoId: string | null } | null => {
  const keys = [...new Set(searchParams.keys())];
  if (keys.length === 0) return null;
  if (keys.some((key) => !(KNOWN_KEYS as readonly string[]).includes(key))) return null;
  if (keys.some((key) => searchParams.getAll(key).length > 1)) return null;

  const state: PhotoFilterState = { ...DEFAULT_FILTER_STATE };

  const rawTag = searchParams.get("tag");
  if (rawTag !== null) {
    const resolved = resolveTag(vocabulary.tags, rawTag);
    if (!resolved) return null;
    state.tag = resolved.id;
  }

  const rawCamera = searchParams.get("camera");
  if (rawCamera !== null) {
    const resolved = resolveCamera(vocabulary.cameras, rawCamera);
    if (!resolved) return null;
    state.camera = resolved;
  }

  const parseFocal = (raw: string | null): number | null | undefined => {
    if (raw === null) return undefined;
    if (!/^\d+$/.test(raw.trim())) return null;
    const value = Number(raw.trim());
    return value >= FOCAL_MIN && value <= FOCAL_MAX ? value : null;
  };
  const focalMin = parseFocal(searchParams.get("focalMin"));
  const focalMax = parseFocal(searchParams.get("focalMax"));
  if (focalMin === null || focalMax === null) return null;
  if (focalMin !== undefined) state.focalMin = focalMin;
  if (focalMax !== undefined) state.focalMax = focalMax;
  if (state.focalMin > state.focalMax) return null;

  let q: string | null = null;
  const rawQ = searchParams.get("q");
  if (rawQ !== null) {
    const trimmed = rawQ.trim();
    if (!trimmed || trimmed.length > MAX_QUERY_CHARS) return null;
    q = trimmed;
  }

  let photoId: string | null = null;
  const rawPhoto = searchParams.get("photo");
  if (rawPhoto !== null) {
    const trimmed = rawPhoto.trim();
    if (!trimmed || trimmed.length > MAX_PHOTO_ID_CHARS) return null;
    if (vocabulary.photoIds && !vocabulary.photoIds.includes(trimmed)) return null;
    photoId = trimmed;
  }

  return { state, q, photoId };
};

/**
 * 정규화된 사진 필터를 canonical URL로 직렬화한다. query 순서는 q, tag, camera,
 * focalMin, focalMax, photo이며 기본값과 빈 값은 생략한다.
 *
 * @param pathname query를 제외한 경로. 로케일 포함 여부는 호출부가 결정한다.
 * @param state 정규화된 필터 상태. 태그는 id, 카메라는 공개 목록의 정확한 이름이다.
 * @param [carry] 필터 밖 보존 파라미터.
 */
const buildPhotoFilterHref = (
  pathname: string,
  state: PhotoFilterState,
  carry?: { q?: string | null; photo?: string | null },
): string => {
  const params = new URLSearchParams();
  const q = carry?.q?.trim();
  if (q) params.set("q", q);
  if (state.tag !== ALL) params.set("tag", state.tag);
  if (state.camera !== ALL) params.set("camera", state.camera);
  if (state.focalMin > FOCAL_MIN) params.set("focalMin", String(state.focalMin));
  if (state.focalMax < FOCAL_MAX) params.set("focalMax", String(state.focalMax));
  const photo = carry?.photo?.trim();
  if (photo) params.set("photo", photo);

  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
};

export {
  ALL,
  buildPhotoFilterHref,
  FOCAL_MAX,
  FOCAL_MIN,
  parsePhotoFilterQuery,
  parsePhotoFilterQueryStrict,
  resolveCamera,
  resolveTag,
};
export type { PhotoFilterState, PhotoFilterVocabulary };
