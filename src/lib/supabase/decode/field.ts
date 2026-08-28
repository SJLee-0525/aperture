import { asText } from "@/lib/i18n/as-text";

import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";
import type { SiteLink } from "@/types/site";
import type { TimelineEntry } from "@/types/timeline";

/**
 * 병합된 jsonb 행에서 도메인 필드를 읽는 최소 리더 집합.
 *
 * 컬렉션 디코더는 이 함수들만 쓴다. `as` 캐스팅으로 읽으면 `?? ` 가 `null`·`undefined`
 * 만 막고 `"3"` 이나 `{}` 는 그대로 통과해, `order` 정렬이 `NaN` 을 내는 식으로
 * 오류 없이 결과만 무너진다.
 */

const readString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const readNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const readBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const readStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/** 객체 하나를 필드 조회가 가능한 형태로 좁힌다. 배열과 `null` 은 객체가 아니다. */
const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/** 객체 배열. 배열이 아니거나 객체가 아닌 원소는 버린다. */
const readObjects = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => typeof item === "object" && item !== null,
      )
    : [];

/** 이중언어 값. `asText` 가 이 집합의 멤버다 — 다른 리더와 같은 폴백 규칙을 따른다. */
const readText = (value: unknown): LocalizedText => asText(value);

/** `readImage` 의 폴백. 소비처는 이 값을 직접 쓰지 않고 `url` 유무로 분기한다. */
const EMPTY_IMAGE: ImageMeta = { url: "", path: "", w: 0, h: 0 };

const readImageOrNull = (value: unknown): ImageMeta | null => {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.url !== "string") return null;
  const variant = (candidate: unknown): ImageMeta | undefined => {
    const nested = readImageOrNull(candidate);
    return nested ?? undefined;
  };
  return {
    url: raw.url,
    path: readString(raw.path),
    w: readNumber(raw.w),
    h: readNumber(raw.h),
    ...(variant(raw.preview) ? { preview: variant(raw.preview) } : {}),
    ...(variant(raw.thumbnail) ? { thumbnail: variant(raw.thumbnail) } : {}),
  };
};

/** 이미지가 없거나 형이 어긋나면 빈 이미지. 소비처가 `url` 유무로 분기한다. */
const readImage = (value: unknown): ImageMeta => readImageOrNull(value) ?? EMPTY_IMAGE;

const readImageArray = (value: unknown): ImageMeta[] =>
  Array.isArray(value)
    ? value.map(readImageOrNull).filter((item): item is ImageMeta => item !== null)
    : [];

/**
 * 값이 없거나 형이 어긋나면 Unix epoch.
 *
 * 폴백을 "지금"으로 두면 같은 행을 두 번 읽을 때 값이 달라지고, 전체 문서를 되쓰는
 * 경로가 그 순간의 시각을 공연일·촬영일로 영속시킨다. epoch 는 결정적이고,
 * 인코더가 이 값을 만나면 키를 생략해 원래의 결측을 보존한다.
 */
const readDate = (value: unknown): Date => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? new Date(0) : value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date(0) : date;
  }
  return new Date(0);
};

/**
 * 비어 있는 것이 정상 상태인 타임스탬프. 초안의 `publishedAt` 처럼
 * epoch 로 채우면 화면의 초안 분기가 깨지는 자리에 쓴다.
 */
const readNullableDate = (value: unknown): Date | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * 저장된 링크를 원문 그대로 읽는다. 공개 표시용 정화는 `decode/public-sanitize` 가 한다 —
 * 읽기에서 정화하면 관리자 폼이 그 빈 값을 다시 저장한다.
 */
const readLinks = (value: unknown): SiteLink[] =>
  readObjects(value).map((item) => ({
    label: readString(item.label),
    href: readString(item.href),
  }));

/** `{period, title}` 항목 배열. 음악 경력·학력과 개발 학력이 같은 모양이다. */
const readTimeline = (value: unknown): TimelineEntry[] =>
  readObjects(value).map((item) => ({
    period: readString(item.period),
    title: readText(item.title),
  }));

/** `readDate` 가 결측에 쓰는 값인지 판별한다. 인코더가 키 생략 여부를 정할 때 본다. */
const isMissingDate = (value: unknown): boolean => value instanceof Date && value.getTime() === 0;

export {
  asRecord,
  isMissingDate,
  readBoolean,
  readDate,
  readImage,
  readImageArray,
  readImageOrNull,
  readLinks,
  readNullableDate,
  readNumber,
  readObjects,
  readString,
  readStringArray,
  readText,
  readTimeline,
};
