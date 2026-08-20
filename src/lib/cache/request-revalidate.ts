import { recordRevalidateFailure } from "@/lib/cache/revalidate-failure-store";
import { revalidatePublicPages } from "@/lib/cache/revalidate-public";
import { getAdminAccessToken } from "@/lib/supabase/auth";

/** 연속 저장(드래그 재정렬 = 문서 N개 병렬 쓰기)을 1회 호출로 합치는 지연. */
const DEBOUNCE_MS = 300;

/** 재검증 대상 한 묶음. 대기 중이거나 요청이 진행 중인 상태를 같은 모양으로 다룬다. */
type RevalidateBatch = { tags: string[]; paths: string[] };

let timer: ReturnType<typeof setTimeout> | null = null;
const pendingTags = new Set<string>();
const pendingPaths = new Set<string>();
/** 요청을 보냈지만 아직 성공을 확인하지 못한 묶음. 성공해야 비운다. */
const inFlight = new Set<RevalidateBatch>();

const revalidateAsCurrentAdmin = async (tags: string[], paths: string[]): Promise<void> => {
  const idToken = await getAdminAccessToken();
  if (!idToken) throw new Error("관리자 인증이 필요합니다.");
  await revalidatePublicPages(idToken, tags, paths);
};

const flushSoon = (): void => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    const batch: RevalidateBatch = { tags: [...pendingTags], paths: [...pendingPaths] };
    pendingTags.clear();
    pendingPaths.clear();
    inFlight.add(batch);
    revalidateAsCurrentAdmin(batch.tags, batch.paths)
      .then(() => {
        inFlight.delete(batch);
      })
      .catch((error: unknown) => {
        inFlight.delete(batch);
        console.warn("[cache] 공개 페이지 재검증 실패 — ISR 주기 후 자동 갱신", error);
        // 콘솔만으로는 관리자가 실패를 알 수 없다. 배너가 읽어 갈 대상과 사유를 남긴다.
        recordRevalidateFailure({
          tags: batch.tags,
          paths: batch.paths,
          reason: error instanceof Error ? error.message : String(error),
        });
      });
  }, DEBOUNCE_MS);
};

/**
 * 아직 성공을 확인하지 못한 재검증 대상을 실패 기록으로 남긴다.
 *
 * 페이지를 떠나면 debounce 대기분은 요청조차 나가지 않고, 진행 중이던 요청은 결과를
 * 받을 곳이 없다. 두 경우 모두 콘솔도 배너도 아무 흔적을 남기지 않아, 공개 페이지가
 * ISR 주기 동안 옛 내용을 보여주는 것을 관리자가 알 수 없었다.
 *
 * 기록은 합집합 병합이라 여러 번 불려도 안전하다. 성공 직후에 불리면 이미 끝난 대상이
 * 배너에 남을 수 있고, 그 경우 재시도는 무해하다.
 *
 * @returns {void}
 */
const flushPendingRevalidateToFailureStore = (): void => {
  const tags = new Set(pendingTags);
  const paths = new Set(pendingPaths);
  for (const batch of inFlight) {
    batch.tags.forEach((tag) => tags.add(tag));
    batch.paths.forEach((path) => paths.add(path));
  }
  if (tags.size === 0 && paths.size === 0) return;

  if (timer) clearTimeout(timer);
  timer = null;
  pendingTags.clear();
  pendingPaths.clear();
  inFlight.clear();
  recordRevalidateFailure({
    tags: [...tags],
    paths: [...paths],
    reason: "저장 직후 페이지를 떠나 재검증 결과를 확인하지 못했습니다.",
  });
};

/**
 * 관리자 쓰기 성공 직후 공개 페이지 ISR 재검증을 요청 — fire-and-forget.
 * 저장은 이미 DB 에 반영된 뒤라, 재검증 실패는 "최대 revalidate 주기만큼 늦게 보임"일 뿐
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

export {
  flushPendingRevalidateToFailureStore,
  requestPublicPathRevalidate,
  requestPublicRevalidate,
};
