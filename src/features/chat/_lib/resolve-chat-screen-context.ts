import { pickText } from "@/lib/i18n/pick-text";

import type { ChatContextOpenTarget, ChatContextTarget } from "@/features/chat/_lib/chat-context";
import type { ChatProfileData } from "@/lib/content/chat";
import type { Lang } from "@/types/lang";

/** 화면 문맥에 필요한 네 종류의 공개 콘텐츠. */
type ScreenContextSource = Pick<
  ChatProfileData,
  "photos" | "musicWorks" | "musicAwards" | "devProjects"
>;

/** target 종류별 `id -> 프롬프트 한 줄` 매핑. 언어별 스냅샷에 저장한다. */
type ScreenContextLookup = Record<ChatContextTarget, Record<string, string>>;

/** 화면 문맥 프롬프트의 최대 문자 수. */
const MAX_SCREEN_CONTEXT_CHARS = 1_500;

/**
 * 공개된 항목만 남긴다.
 *
 * @template T
 * @param {T[]} items 공개 여부를 가진 항목 목록.
 * @returns {T[]} published가 true인 항목.
 */
const published = <T extends { published: boolean }>(items: T[]) =>
  items.filter((item) => item.published === true);

/**
 * 유효한 Date를 YYYY-MM-DD 형식으로 바꾼다.
 *
 * @param {Date} value 변환할 날짜.
 * @returns {string | null} 날짜 문자열. 유효하지 않으면 null.
 */
const isoDate = (value: Date): string | null => {
  const time = value instanceof Date ? value.getTime() : Number.NaN;
  return Number.isFinite(time) ? value.toISOString().slice(0, 10) : null;
};

/**
 * 비어 있지 않은 문맥 조각을 구분자로 연결한다.
 *
 * @param {Array<string | null>} parts 연결할 문맥 조각.
 * @returns {string} 빈 값을 제외하고 연결한 문자열.
 */
const joinParts = (parts: Array<string | null>): string =>
  parts.filter((part): part is string => Boolean(part)).join(" | ");

/**
 * 값이 있을 때만 `label: value` 형식의 문맥 조각을 만든다.
 *
 * @param {string} label 필드 이름.
 * @param {string | null | undefined} value 필드 값.
 * @returns {string | null} 문맥 조각. 값이 없으면 null.
 */
const part = (label: string, value: string | null | undefined): string | null =>
  value ? `${label}: ${value}` : null;

/**
 * 공개된 사진, 연주, 수상, 프로젝트의 화면 문맥 lookup을 만든다.
 *
 * @param {ScreenContextSource} data
 * @param {Lang} lang
 * @returns {ScreenContextLookup}
 */
const buildScreenContextLookup = (data: ScreenContextSource, lang: Lang): ScreenContextLookup => ({
  photo: Object.fromEntries(
    published(data.photos).map((photo) => [
      photo.id,
      joinParts([
        `Photo: ${pickText(photo.title, lang)}`,
        part("place", pickText(photo.place, lang)),
        part("camera", photo.camera),
        part("lens", photo.lens),
        part("aperture", photo.exif.aperture),
        part("shutter", photo.exif.shutter),
        part("iso", photo.exif.iso),
        part("focal length", photo.exif.focalLength),
        part("shot on", isoDate(photo.shotAt)),
      ]),
    ]),
  ),
  work: Object.fromEntries(
    published(data.musicWorks).map((work) => [
      work.id,
      joinParts([
        `Performance: ${pickText(work.title, lang)}`,
        part("date", isoDate(work.performedAt)),
        part("venue", pickText(work.venue, lang)),
        part("program", work.program.join(", ")),
      ]),
    ]),
  ),
  award: Object.fromEntries(
    published(data.musicAwards).map((award) => [
      award.id,
      joinParts([
        `Music award: ${pickText(award.name, lang)}`,
        part("year", String(award.year)),
        part("placement", award.place),
      ]),
    ]),
  ),
  project: Object.fromEntries(
    published(data.devProjects).map((project) => [
      project.id,
      joinParts([
        `Project: ${pickText(project.title, lang)}`,
        part("summary", pickText(project.summary, lang)),
        part("role", pickText(project.position, lang)),
        part("tech", project.techTags.join(", ")),
        part("achievements", project.achievements.map((item) => pickText(item, lang)).join("; ")),
      ]),
    ]),
  ),
});

/**
 * 화면 항목 한 줄을 SCREEN_CONTEXT 블록으로 감싸고 길이를 제한한다.
 *
 * @param {string} entry 서버가 공개 데이터로 만든 항목 설명.
 * @returns {string} provider에 전달할 화면 문맥 블록.
 */
const formatScreenContextBlock = (entry: string): string =>
  ["# SCREEN_CONTEXT", "The visitor currently has this item open on screen:", entry]
    .join("\n")
    .slice(0, MAX_SCREEN_CONTEXT_CHARS);

/**
 * lookup의 own property에 저장된 문자열 항목만 읽는다.
 *
 * @param {ScreenContextLookup} lookup 화면 문맥 lookup.
 * @param {ChatContextOpenTarget} openTarget 찾을 target과 id.
 * @returns {string | undefined} 항목 설명. 없거나 문자열이 아니면 undefined.
 */
const entryOf = (
  lookup: ScreenContextLookup,
  openTarget: ChatContextOpenTarget,
): string | undefined => {
  const record = lookup[openTarget.type];
  const entry = Object.hasOwn(record, openTarget.id) ? record[openTarget.id] : undefined;
  return typeof entry === "string" && entry ? entry : undefined;
};

/**
 * 열린 모달의 화면 문맥을 찾는다. 대상이 없으면 데이터를 읽지 않는다. live 환경에서는
 * 사진 위치처럼 수정될 수 있는 필드가 오래된 RAG 스냅샷에 남지 않도록 최신 조회를 우선한다.
 * 최신 조회가 실패하거나 항목이 없을 때만 캐시된 스냅샷으로 물러난다.
 *
 * @param {ChatContextOpenTarget | undefined} openTarget 현재 열린 target.
 * @param {{ getScreenLookup: () => Promise<ScreenContextLookup>; getFreshScreenLookup?: () => Promise<ScreenContextLookup> }} deps lookup 로더.
 * @returns {Promise<string | undefined>} provider에 전달할 화면 문맥. 항목이 없으면 undefined.
 */
const resolveScreenContext = async (
  openTarget: ChatContextOpenTarget | undefined,
  deps: {
    getScreenLookup: () => Promise<ScreenContextLookup>;
    getFreshScreenLookup?: () => Promise<ScreenContextLookup>;
  },
): Promise<string | undefined> => {
  if (!openTarget) return undefined;

  let fresh: string | undefined;
  if (deps.getFreshScreenLookup) {
    try {
      fresh = entryOf(await deps.getFreshScreenLookup(), openTarget);
    } catch {
      // 최신 조회 장애가 채팅 전체 장애가 되지 않도록 캐시로 계속한다.
    }
  }
  const entry = fresh ?? entryOf(await deps.getScreenLookup(), openTarget);
  return entry ? formatScreenContextBlock(entry) : undefined;
};

export { buildScreenContextLookup, MAX_SCREEN_CONTEXT_CHARS, resolveScreenContext };
