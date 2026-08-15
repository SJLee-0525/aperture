import { matchDevArticleSlug, ROUTES } from "@/constants/routes";
import { langFromPath, stripLangPrefix, stripTrailingSlash } from "@/lib/i18n/locale-path";

/** 화면 문맥이 가리킬 수 있는 상세 모달 종류 */
type ChatContextTarget = "photo" | "work" | "award" | "project" | "article";

type ChatContextOpenTarget = {
  type: ChatContextTarget;
  id: string;
};

/**
 * 질문을 보낸 시점의 URL에서 만든 화면 문맥.
 * 제목·본문 같은 콘텐츠는 클라이언트에서 받지 않고 서버가 id로 재조회한다.
 */
type ChatContext = {
  pathname: string;
  openTarget?: ChatContextOpenTarget;
  // photoFilters는 후속 단계에서 추가한다. 현재 파서는 이 키를 무시한다.
};

/**
 * 로케일을 제외한 상세 모달 경로와 target/query key의 대응표.
 * `queryKey`가 null이면 id가 URL에 없다는 뜻이고, 화면이 등록한 target에서 읽는다.
 */
const CONTEXT_TARGET_BY_PATH: Readonly<
  Partial<Record<string, { type: ChatContextTarget; queryKey: string | null }>>
> = {
  [ROUTES.PHOTO]: { type: "photo", queryKey: "photo" },
  [ROUTES.MUSIC]: { type: "work", queryKey: "work" },
  [ROUTES.MUSIC_CAREER]: { type: "award", queryKey: "award" },
  [ROUTES.DEV_PROJECTS]: { type: "project", queryKey: "project" },
};

/** 화면 문맥을 허용하는 공개 경로. 로케일을 제외한 경로가 정확히 일치해야 한다. */
const ALLOWED_CONTEXT_PATHS: ReadonlySet<string> = new Set([
  ROUTES.LANDING,
  ROUTES.PHOTO,
  ROUTES.PHOTO_ALBUMS,
  ROUTES.PHOTO_MAP,
  ROUTES.PHOTO_ABOUT,
  ROUTES.MUSIC,
  ROUTES.MUSIC_CAREER,
  ROUTES.MUSIC_MEDIA,
  ROUTES.MUSIC_ABOUT,
  ROUTES.DEV,
  ROUTES.DEV_ARTICLES,
  ROUTES.DEV_PROJECTS,
  ROUTES.DEV_CAREER,
  ROUTES.CONTACT,
  ROUTES.SEARCH,
  ROUTES.PRIVACY,
  ROUTES.TERMS,
  ROUTES.ACCESSIBILITY,
]);

/** 앨범 상세는 동적 slug 한 단계만 허용한다. */
const ALBUM_DETAIL_PATH_PATTERN = /^\/photo\/albums\/[A-Za-z0-9-]+$/;

const MAX_PATHNAME_CHARS = 128;
const MAX_TARGET_ID_CHARS = 64;

/** 문서 ID에 허용하는 문자. */
const TARGET_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_CONTEXT_BYTES = 600;

/**
 * 공개 경로에 쓸 수 있는 소문자 ASCII 문자만 허용한다.
 */
const PATHNAME_PATTERN = /^\/[A-Za-z0-9\-/]*$/;

/**
 * 배열이 아닌 객체인지 확인한다.
 *
 * @param {unknown} value 확인할 값.
 * @returns {value is Record<string, unknown>} 일반 객체이면 true.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * 로케일이 포함된 공개 pathname을 정규화한다. 마지막 slash 하나는 제거한다.
 * 클라이언트 빌더와 서버 파서가 같은 함수를 쓴다.
 *
 * @param {string} raw
 * @returns {string | null} 정규화된 pathname 또는 null(비허용)
 */
const normalizeContextPathname = (raw: string): string | null => {
  if (raw.length === 0 || raw.length > MAX_PATHNAME_CHARS) return null;
  if (!PATHNAME_PATTERN.test(raw) || raw.includes("//")) return null;
  const pathname = stripTrailingSlash(raw);
  if (!langFromPath(pathname)) return null;
  const localPathname = stripLangPrefix(pathname);
  // 목록 경로를 allowlist 에 넣는 것만으로는 `/dev/articles/<slug>` 가 통과하지 못한다.
  if (
    !ALLOWED_CONTEXT_PATHS.has(localPathname) &&
    !ALBUM_DETAIL_PATH_PATTERN.test(localPathname) &&
    !matchDevArticleSlug(localPathname)
  ) {
    return null;
  }
  return pathname;
};

/**
 * 정규화된 pathname의 상세 모달 매핑 조회
 *
 * @param {string} pathname 로케일 포함 정규화 경로
 * @returns {{ type: ChatContextTarget; queryKey: string } | null}
 */
const contextTargetForPath = (
  pathname: string,
): { type: ChatContextTarget; queryKey: string | null } | null => {
  const localPathname = stripLangPrefix(pathname);
  if (ALBUM_DETAIL_PATH_PATTERN.test(localPathname)) {
    return { type: "photo", queryKey: "photo" };
  }
  // 글 상세는 URL 에 문서 ID 가 없다. slug 는 화면 문맥의 식별자가 아니라 서버 검증용이다.
  if (matchDevArticleSlug(localPathname)) return { type: "article", queryKey: null };
  return CONTEXT_TARGET_BY_PATH[localPathname] ?? null;
};

/**
 * target id의 형식과 길이를 검사한다.
 *
 * 서버가 이 값으로 DB 문서 한 건을 직접 읽으므로 경로 구분자와 query 문자를 허용하지 않는다.
 * 기존 Firestore 자동 ID와 이 저장소가 쓰는 수동 ID가 모두 이 문자 집합 안에 있다.
 *
 * @param {unknown} raw 요청 또는 query에서 읽은 값.
 * @returns {string | null} 정리한 id. 유효하지 않으면 null.
 */
const parseTargetId = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  if (!id || id.length > MAX_TARGET_ID_CHARS) return null;
  return TARGET_ID_PATTERN.test(id) ? id : null;
};

/**
 * 직렬화한 화면 문맥이 요청별 byte 제한 안에 있는지 확인한다.
 *
 * @param {ChatContext} context 정규화된 화면 문맥.
 * @returns {boolean} UTF-8 JSON이 제한 이하이면 true.
 */
const withinByteBudget = (context: ChatContext): boolean =>
  new TextEncoder().encode(JSON.stringify(context)).byteLength <= MAX_CONTEXT_BYTES;

/**
 * 질문을 보내는 시점의 URL로 클라이언트 화면 문맥을 만든다.
 * 여러 modal key가 있어도 현재 경로에 해당하는 key만 읽는다.
 *
 * 글 상세처럼 id가 URL에 없는 경로는 화면이 등록해 둔 target에서 문서 ID를 읽는다.
 * slug를 대신 쓰지 않는 이유는 문서 ID가 바뀌지 않는 식별자이기 때문이다.
 *
 * @param {string} pathname window.location.pathname (로케일 포함)
 * @param {URLSearchParams} searchParams
 * @param {{ type: string; id: string } | null} [screenTarget] 화면이 등록한 상세 항목.
 * @returns {ChatContext | undefined}
 */
const buildChatContext = (
  pathname: string,
  searchParams: URLSearchParams,
  screenTarget?: { type: string; id: string } | null,
): ChatContext | undefined => {
  const normalized = normalizeContextPathname(pathname);
  if (!normalized) return undefined;

  const context: ChatContext = { pathname: normalized };
  const target = contextTargetForPath(normalized);
  if (target) {
    const raw = target.queryKey
      ? searchParams.get(target.queryKey)
      : screenTarget?.type === target.type
        ? screenTarget.id
        : null;
    const id = parseTargetId(raw);
    if (id) context.openTarget = { type: target.type, id };
  }
  return withinByteBudget(context) ? context : undefined;
};

/**
 * 요청 본문의 화면 문맥을 서버에서 검증한다.
 * 검증 실패는 예외를 던지지 않는다. pathname이 비허용이면 문맥 전체를,
 * openTarget이 경로와 맞지 않으면 openTarget만 버리고 채팅은 계속된다.
 *
 * @param {unknown} value
 * @returns {ChatContext | undefined}
 */
const parseChatContext = (value: unknown): ChatContext | undefined => {
  if (!isRecord(value) || typeof value.pathname !== "string") return undefined;
  const pathname = normalizeContextPathname(value.pathname);
  if (!pathname) return undefined;

  const context: ChatContext = { pathname };
  if (isRecord(value.openTarget)) {
    const target = contextTargetForPath(pathname);
    const id = parseTargetId(value.openTarget.id);
    if (target && id && value.openTarget.type === target.type) {
      context.openTarget = { type: target.type, id };
    }
  }
  return withinByteBudget(context) ? context : undefined;
};

export { buildChatContext, contextTargetForPath, parseChatContext };
export type { ChatContext, ChatContextOpenTarget, ChatContextTarget };
