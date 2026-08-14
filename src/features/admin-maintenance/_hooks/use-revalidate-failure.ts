"use client";

import { useCallback, useEffect, useState } from "react";

import {
  clearRevalidateFailure,
  readRevalidateFailure,
  subscribeRevalidateFailure,
  type RevalidateFailure,
} from "@/lib/cache/revalidate-failure-store";
import { revalidatePublicPages } from "@/lib/cache/revalidate-public";
import { getFirebaseAuth } from "@/lib/firebase/client";

type RevalidateFailureAlert = {
  failure: RevalidateFailure | null;
  retrying: boolean;
  /** 재시도 자체가 실패한 사유. 성공하면 비워진다. */
  error: string | null;
  retry: () => void;
};

/**
 * 남아 있는 재검증 실패를 읽고 재시도한다.
 *
 * 실패는 저장 성공 이후에만 기록되므로 여기서 하는 일은 캐시 무효화뿐이다. 재시도가 성공하면
 * 기록을 지우고, 실패하면 대상은 그대로 두어 다음에 다시 시도할 수 있게 한다.
 *
 * @returns {RevalidateFailureAlert} 표시할 실패와 재시도 동작.
 */
const useRevalidateFailure = (): RevalidateFailureAlert => {
  const [failure, setFailure] = useState<RevalidateFailure | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setFailure(readRevalidateFailure());
    sync();
    return subscribeRevalidateFailure(sync);
  }, []);

  const retry = useCallback(() => {
    if (!failure) return;
    setRetrying(true);
    setError(null);
    const run = async () => {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error("관리자 인증이 필요합니다.");
      await revalidatePublicPages(await user.getIdToken(), failure.tags, failure.paths);
    };
    run()
      .then(() => clearRevalidateFailure())
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : String(caught));
      })
      .finally(() => setRetrying(false));
  }, [failure]);

  return { failure, retrying, error, retry };
};

export { useRevalidateFailure };
export type { RevalidateFailureAlert };
