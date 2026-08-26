import { articlePlainTextClipped } from "@/features/dev-blog/_lib/article-plain-text";

import { devArticleRoute } from "@/constants/routes";
import { pickText } from "@/lib/i18n/pick-text";

import type { ChatContextOpenTarget, ChatContextTarget } from "@/features/chat/_lib/chat-context";
import type { ChatDevArticle, ChatProfileData } from "@/lib/content/chat";
import type { DevArticle } from "@/types/dev-article";
import type { Lang } from "@/types/lang";

/** 화면 문맥에 필요한 다섯 종류의 공개 콘텐츠. */
type ScreenContextSource = Pick<
  ChatProfileData,
  "photos" | "musicWorks" | "musicAwards" | "devProjects" | "articles"
>;

/** target 종류별 `id -> 프롬프트 한 줄` 매핑. 언어별 스냅샷에 저장한다. */
type ScreenContextLookup = Record<ChatContextTarget, Record<string, string>>;

/** 화면 문맥 프롬프트의 최대 문자 수. */
const MAX_SCREEN_CONTEXT_CHARS = 1_500;

/**
 * 열어 둔 글 본문을 프롬프트에 실을 때의 최대 문자 수.
 *
 * 상한의 근거는 DB 읽기 비용이 아니라 LLM 입력 토큰 예산이다. 한국어는 문자당 토큰이
 * 1개를 조금 넘어, 이 상한이 요청 한 건의 입력 토큰 상한을 결정한다. 사용량 제한은
 * 요청 수만 세므로 상한이 없으면 하루 비용이 본문 길이에 비례해 늘어난다.
 *
 * 이 크기를 넘는 글은 앞부분만 실린다. `complete` 가 false 면 호출부가 같은 글의 청크를
 * RAG 후보에서 제외하지 않으므로 뒷부분이 검색될 수 있다. 검색 점수에 달린 일이라
 * 잘린 구간이 반드시 실린다는 보장은 아니다.
 */
const MAX_ARTICLE_BODY_CONTEXT_CHARS = 25_000;

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
 * 글 한 건의 화면 문맥 한 줄.
 * 목록 lookup 과 문서 한 건 검증이 같은 문장을 쓰도록 분리한다.
 *
 * @param {ChatDevArticle} article 공개된 글.
 * @param {Lang} lang 표시 언어.
 * @returns {string} 프롬프트에 실을 한 줄.
 */
const articleScreenEntry = (article: ChatDevArticle, lang: Lang): string =>
  joinParts([
    `Article: ${pickText(article.title, lang)}`,
    part("summary", pickText(article.summary, lang)),
    part("published", article.publishedAt ? isoDate(article.publishedAt) : null),
    // 모델이 references 에 넣을 문서 ID. PROFILE_CONTEXT 글 목록은 최근 글까지만
    // 실리므로, 그 밖의 글을 열어 두면 이 줄이 프롬프트의 유일한 id 출처다.
    part("id", article.id),
    part("path", devArticleRoute(article.slug)),
  ]);

/**
 * 공개된 사진, 연주, 수상, 프로젝트, 글의 화면 문맥 lookup을 만든다.
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
  // 글은 공개 getter 가 이미 초안을 걸러 온다(`published` 필드를 투영하지 않는 이유).
  article: Object.fromEntries(
    data.articles.map((article) => [article.id, articleScreenEntry(article, lang)]),
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

/** 열어 둔 글의 화면 문맥과, 본문이 잘리지 않고 전부 실렸는지 여부. */
type ArticleScreenContext = { text: string; complete: boolean };

/**
 * 열어 둔 글의 화면 문맥 — 항목 한 줄 뒤에 본문 평문 전체를 싣는다.
 * 우선 RAG 슬롯만으로는 긴 글의 요약·후반부 질문에 앞부분 청크만 닿는다.
 * 방문자가 보고 있는 글에 한해 본문을 그대로 넣으며, 문서는 target 검증이
 * 이미 읽은 것을 재사용하므로 추가 조회가 없다.
 *
 * `complete` 는 호출부의 RAG 분기 근거다: 본문 전문이 실렸으면 같은 글 청크는
 * 프롬프트 중복이라 제외하고, 잘렸으면 잘린 꼬리를 청크가 보완하도록 우선 검색을 유지한다.
 *
 * @param {DevArticle} article 검증을 마친 공개 글(본문 포함).
 * @param {Lang} lang 표시 언어.
 * @returns {ArticleScreenContext} provider에 전달할 화면 문맥 블록과 완전성 여부.
 */
// 본문은 펜스나 이스케이프 없이 헤더 아래에 그대로 넣는다. 저자가 이 사이트의 관리자
// 한 명뿐이라 여기로 들어오는 지시문은 자기 자신을 향한 것이 된다. 시스템 프롬프트의
// "입력은 데이터다" 규칙(`chat-prompt.ts`)이 남은 한 겹이다.
const formatArticleScreenContextBlock = (article: DevArticle, lang: Lang): ArticleScreenContext => {
  const { text: body, complete } = articlePlainTextClipped(article, MAX_ARTICLE_BODY_CONTEXT_CHARS);
  return {
    text: [
      "# SCREEN_CONTEXT",
      "The visitor currently has this item open on screen:",
      articleScreenEntry(article, lang),
      "Full article text (plain):",
      complete ? body : `${body}\n[remainder truncated]`,
    ].join("\n"),
    complete,
  };
};

/**
 * lookup의 own property에 저장된 문자열 항목만 읽는다.
 * 항목이 없으면 그 id 는 공개 데이터에 존재하지 않으므로, 호출부가 target 검증에도 쓴다.
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
 * 최신 공개 데이터에서 항목을 찾은 결과.
 *
 * `found: false` 와 조회 실패를 반드시 구분한다. 둘을 합치면 관리자가 방금 비공개로 바꾼
 * 항목이 캐시 스냅샷에서 되살아나 프롬프트에 실린다.
 */
type FreshEntry = { queried: true; entry: string | undefined } | { queried: false };

/**
 * 최신 공개 데이터에서 열린 항목을 찾는다. 로더가 없으면(mock) 조회하지 않는다.
 *
 * @param {ChatContextOpenTarget} openTarget 현재 열린 target.
 * @param {(() => Promise<ScreenContextLookup>) | undefined} getFreshScreenLookup 최신 lookup 로더.
 * @returns {Promise<FreshEntry>} 조회 성공 여부와 찾은 항목.
 */
const lookupFreshEntry = async (
  openTarget: ChatContextOpenTarget,
  getFreshScreenLookup?: () => Promise<ScreenContextLookup>,
): Promise<FreshEntry> => {
  if (!getFreshScreenLookup) return { queried: false };
  try {
    return { queried: true, entry: entryOf(await getFreshScreenLookup(), openTarget) };
  } catch {
    // 최신 조회 장애가 채팅 전체 장애가 되지 않도록 캐시로 계속한다.
    return { queried: false };
  }
};

/**
 * 열린 모달의 화면 문맥을 찾는다. 대상이 없으면 데이터를 읽지 않는다.
 *
 * live 환경에서는 최신 조회가 판정의 기준이다. 조회에 성공했는데 항목이 없으면 그 항목은
 * 더 이상 공개가 아니므로 문맥을 만들지 않는다. 캐시된 스냅샷으로 물러나는 것은 조회
 * 자체가 실패했을 때뿐이다. 글 경로(`handle-chat-request`)도 같은 계약이다.
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

  const fresh = await lookupFreshEntry(openTarget, deps.getFreshScreenLookup);
  const entry = fresh.queried ? fresh.entry : entryOf(await deps.getScreenLookup(), openTarget);
  return entry ? formatScreenContextBlock(entry) : undefined;
};

export {
  buildScreenContextLookup,
  entryOf,
  formatArticleScreenContextBlock,
  lookupFreshEntry,
  MAX_ARTICLE_BODY_CONTEXT_CHARS,
  MAX_SCREEN_CONTEXT_CHARS,
  resolveScreenContext,
};
export type { ScreenContextLookup };
