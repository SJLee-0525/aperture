import { ROUTES } from "@/constants/routes";
import {
  buildPhotoFilterHref,
  parsePhotoFilterQueryStrict,
  type PhotoFilterVocabulary,
} from "@/lib/photo/filter-query";

import type { ChatLink, ChatReference, ChatReferenceType } from "@/types/chat";

/** 모델이 만든 액션 링크가 가리켜도 되는 지면. 목록 밖 경로는 버린다. */
const ALLOWED_ACTION_ROUTES = new Set<string>([
  ROUTES.CONTACT,
  ROUTES.DEV,
  ROUTES.DEV_ARTICLES,
  ROUTES.DEV_CAREER,
  ROUTES.DEV_PROJECTS,
  ROUTES.MUSIC,
  ROUTES.MUSIC_ABOUT,
  ROUTES.MUSIC_CAREER,
  ROUTES.MUSIC_MEDIA,
  ROUTES.PHOTO,
  ROUTES.PHOTO_ABOUT,
  ROUTES.PHOTO_ALBUMS,
  ROUTES.PHOTO_MAP,
]);

/**
 * 모델이 반환한 href를 내부 상대 경로로 검증한다. `new URL()`이 dot segment를
 * 정규화하기 전에 raw pathname을 검사한다. 공개 pathname에는 percent encoding을
 * 허용하지 않으며 query 값에서만 허용한다.
 *
 * @param {string} href
 * @returns {{ pathname: string; searchParams: URLSearchParams } | null}
 */
const parseInternalHref = (
  href: string,
): { pathname: string; searchParams: URLSearchParams } | null => {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\")) return null;
  const rawPath = href.split(/[?#]/)[0] ?? "";
  if (rawPath.includes("%")) return null;
  if (rawPath.split("/").some((segment) => segment === "." || segment === "..")) return null;

  let url: URL;
  try {
    url = new URL(href, "https://internal.invalid");
  } catch {
    return null;
  }
  if (url.username || url.password || url.host !== "internal.invalid") return null;
  // 내부 액션 링크에는 fragment를 사용하지 않는다.
  if (url.hash !== "") return null;
  // raw와 정규화 결과가 다르면 위장 입력이다.
  if (url.pathname !== rawPath) return null;
  return { pathname: url.pathname, searchParams: url.searchParams };
};

/** 사진 작업 경로에 하나 이상의 query가 있는지 확인한다. */
const isPhotoQueryRoute = (parsed: { pathname: string; searchParams: URLSearchParams }): boolean =>
  parsed.pathname === ROUTES.PHOTO && !parsed.searchParams.keys().next().done;

/**
 * 참조 카드 종류별로 카드가 대신하는 목록 경로.
 * 개발은 `/dev`(소개)가 아니라 각 목록을 가린다. 소개까지 넣으면 카드가 붙은 답변에서
 * 소개 링크가 함께 사라진다.
 */
const REFERENCE_SECTION_ROUTES: Record<ChatReferenceType, string> = {
  article: ROUTES.DEV_ARTICLES,
  music: ROUTES.MUSIC,
  photo: ROUTES.PHOTO,
  project: ROUTES.DEV_PROJECTS,
};

/**
 * 모델이 반환한 링크를 공개 내부 경로로 제한하고 사진 query를 canonical URL로 바꾼다.
 *
 * @param {ChatLink[] | undefined} links provider가 반환한 링크 후보.
 * @param {ChatReference[] | undefined} references 응답에 함께 표시할 참조 카드.
 * @param {PhotoFilterVocabulary | undefined} photoVocabulary 사진 query 검증용 공개 어휘.
 * @returns {ChatLink[] | undefined} 최대 두 개의 검증된 링크.
 */
const sanitizeLinks = (
  links: ChatLink[] | undefined,
  references: ChatReference[] | undefined,
  photoVocabulary?: PhotoFilterVocabulary,
): ChatLink[] | undefined => {
  // 참조 카드가 이미 대신하는 목록 경로는 링크에서 뺀다.
  const referencedSections = [
    ...new Set(references?.map(({ type }) => REFERENCE_SECTION_ROUTES[type])),
  ];
  const safe = links
    ?.flatMap((link) => {
      if (!link.label.trim()) return [];
      const parsed = parseInternalHref(link.href);
      if (!parsed || !ALLOWED_ACTION_ROUTES.has(parsed.pathname)) return [];

      let href = link.href;
      // 사진 밖 경로는 query 를 그대로 둔다. pathname 이 이미 허용목록에 갇혀 있고 링크는
      // 내부 페이지로만 가므로, 남는 영향은 그 페이지가 조작된 상태로 열리는 정도다.
      // strict codec 은 사진 필터 어휘에만 있어 다른 경로에는 검증 기준 자체가 없다.
      if (isPhotoQueryRoute(parsed)) {
        // /photo 필터 query는 strict codec으로 검증 후 canonical로 재직렬화한다.
        // 공개 어휘를 읽지 못하면 query가 있는 사진 링크를 버린다.
        if (!photoVocabulary) return [];
        const strict = parsePhotoFilterQueryStrict(parsed.searchParams, photoVocabulary);
        if (!strict) return [];
        href = buildPhotoFilterHref(ROUTES.PHOTO, strict.state, {
          q: strict.q,
          photo: strict.photoId,
        });
      }

      if (
        referencedSections.some((section) => href === section || href.startsWith(`${section}/`))
      ) {
        return [];
      }
      // 참조 카드가 이미 가리키는 딥링크와 canonical href가 같으면 중복 노출이다.
      if (references?.some((reference) => reference.href === href)) return [];
      return [{ ...link, href }];
    })
    .slice(0, 2);
  return safe?.length ? safe : undefined;
};

export { isPhotoQueryRoute, parseInternalHref, sanitizeLinks };
