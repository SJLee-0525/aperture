import {
  clearRevalidateFailure,
  readRevalidateFailure,
  recordRevalidateFailure,
} from "@/lib/cache/revalidate-failure-store";
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

/**
 * 성공한 묶음이 저장된 실패 기록을 모두 덮으면 기록을 지운다.
 *
 * 저장소가 tags·paths 를 하나의 합집합으로 보관해 묶음별 삭제가 없다. 부분집합일 때만
 * 지우므로, 다른 실패가 함께 남아 있으면 건드리지 않는다. 그 경우 이미 끝난 대상이
 * 배너에 남지만 재시도는 무해하다.
 */
const clearFailureCoveredBy = (batch: RevalidateBatch): void => {
  const failure = readRevalidateFailure();
  if (!failure) return;
  const tags = new Set(batch.tags);
  const paths = new Set(batch.paths);
  const covered =
    failure.tags.every((tag) => tags.has(tag)) && failure.paths.every((path) => paths.has(path));
  if (covered) clearRevalidateFailure();
};

const sendBatch = (batch: RevalidateBatch): void => {
  inFlight.add(batch);
  revalidateAsCurrentAdmin(batch.tags, batch.paths)
    .then(() => {
      inFlight.delete(batch);
      // 이탈 시 미리 남긴 기록을 이 성공이 덮으면 배너를 정리한다.
      clearFailureCoveredBy(batch);
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
};

/** 대기 중인 대상을 묶음으로 떼어 낸다. 없으면 `null`. */
const takePending = (): RevalidateBatch | null => {
  if (pendingTags.size === 0 && pendingPaths.size === 0) return null;
  const batch: RevalidateBatch = { tags: [...pendingTags], paths: [...pendingPaths] };
  pendingTags.clear();
  pendingPaths.clear();
  return batch;
};

const flushSoon = (): void => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    const batch = takePending();
    if (batch) sendBatch(batch);
  }, DEBOUNCE_MS);
};

/**
 * 페이지를 떠날 때 아직 끝나지 않은 재검증을 실패 기록으로 남기고 대기분을 즉시 보낸다.
 *
 * 기록을 먼저 남기는 이유는 순서다. 보내고 실패했을 때만 기록하면, 페이지가 죽는 순간
 * 콜백이 실행되지 않아 아무 흔적도 남지 않는다. 요청이 성공하면 성공 콜백이 그 기록을
 * 지운다.
 *
 * 진행 중인 요청은 취소하지 않는다. `pagehide` 는 뒤로 가기 캐시로 들어갈 때도 발생하며,
 * 복원되면 그 요청이 그대로 끝난다.
 *
 * @param {{ persisted?: boolean }} [options] `persisted` 는 뒤로 가기 캐시 진입 신호다.
 *   요청이 끝났다는 보장이 아니라, 페이지가 살아 있어 콜백이 이어진다는 뜻이다.
 * @returns {void}
 */
const flushPendingRevalidateToFailureStore = (options: { persisted?: boolean } = {}): void => {
  const pending = takePending();
  const outstanding: RevalidateBatch[] = [...inFlight, ...(pending ? [pending] : [])];
  if (outstanding.length === 0) return;

  if (timer) clearTimeout(timer);
  timer = null;

  // 뒤로 가기 캐시로 들어가는 이동은 페이지가 살아 있다. 기록을 남기면 오탐이 된다.
  if (!options.persisted) {
    recordRevalidateFailure({
      tags: [...new Set(outstanding.flatMap((batch) => batch.tags))],
      paths: [...new Set(outstanding.flatMap((batch) => batch.paths))],
      reason: "저장 직후 페이지를 떠나 재검증 결과를 확인하지 못했습니다.",
    });
  }
  // 대기 중이던 대상은 debounce 를 기다리지 않고 바로 보낸다.
  if (pending) sendBatch(pending);
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
