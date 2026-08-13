import { revalidatePublicPages } from "@/lib/cache/revalidate-public";
import { getFirebaseAuth } from "@/lib/firebase/client";

/** 연속 저장(드래그 재정렬 = 문서 N개 병렬 쓰기)을 1회 호출로 합치는 지연. */
const DEBOUNCE_MS = 300;

let timer: ReturnType<typeof setTimeout> | null = null;
const pendingTags = new Set<string>();
const pendingPaths = new Set<string>();

const revalidateAsCurrentAdmin = async (tags: string[], paths: string[]): Promise<void> => {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("관리자 인증이 필요합니다.");
  const idToken = await user.getIdToken();
  await revalidatePublicPages(idToken, tags, paths);
};

const flushSoon = (): void => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    const tagsToRevalidate = [...pendingTags];
    const pathsToRevalidate = [...pendingPaths];
    pendingTags.clear();
    pendingPaths.clear();
    revalidateAsCurrentAdmin(tagsToRevalidate, pathsToRevalidate).catch((error) => {
      console.warn("[cache] 공개 페이지 재검증 실패 — ISR 주기 후 자동 갱신", error);
    });
  }, DEBOUNCE_MS);
};

/**
 * 관리자 쓰기 성공 직후 공개 페이지 ISR 재검증을 요청 — fire-and-forget.
 * 저장은 이미 Firestore 에 반영된 뒤라, 재검증 실패는 "최대 revalidate 주기만큼 늦게 보임"일 뿐
 * 데이터 유실이 아니다 → 저장 UX 를 막지 않고 실패는 경고 로그만 남긴다.
 *
 * @param {string[]} tags
 * @returns {void}
 */
const requestPublicRevalidate = (...tags: string[]): void => {
  tags.forEach((tag) => pendingTags.add(tag));
  flushSoon();
};

/**
 * 특정 공개 경로의 라우트 캐시까지 지우도록 요청한다. 태그와 같은 debounce 로 합쳐진다.
 *
 * 발행 전에 렌더되어 캐시로 남은 404는 태그 무효화로 갱신되지 않는다.
 * 발행·발행 취소·삭제처럼 경로의 존재 여부가 바뀌는 쓰기에서 사용한다.
 *
 * @param {string[]} paths 리터럴 공개 경로 (`/ko/dev/articles/slug`).
 * @returns {void}
 */
const requestPublicPathRevalidate = (...paths: string[]): void => {
  paths.forEach((path) => pendingPaths.add(path));
  flushSoon();
};

export { requestPublicPathRevalidate, requestPublicRevalidate };
