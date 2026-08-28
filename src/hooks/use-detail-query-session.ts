"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { detailQueryHref } from "@/lib/navigation/detail-query-url";
import { pushCurrentUrl, replaceCurrentUrl } from "@/lib/navigation/replace-current-url";

import type { DetailQueryKey } from "@/constants/routes";

type Options = {
  /**
   * 이 상세를 훅 밖에서도 여는지. 사진은 타일과 지도 핀이 `openDetailQuery` 로 직접 연다.
   * 그 경로도 entry 를 쌓으므로 닫기가 뒤로가기를 써야 한다.
   *
   * 훅이 유일한 쓰기 경로인 키에서 켜면 안 된다. 딥링크나 앞으로 가기로 다시 열렸을 때도
   * 우리 entry 로 세어, 닫기가 방문자를 이전 페이지로 내보낸다.
   */
  openedOutside?: boolean;
};

/**
 * 상세 모달의 URL·history 규칙. `?key=id` 가 열림 상태의 단일 출처다(딥링크·공유).
 *
 * 첫 열기만 history entry 를 쌓고, 그때만 닫기가 뒤로가기를 쓴다. 열린 채로 다른 항목으로
 * 옮기는 것은 새 진입이 아니라 교체다. push 하면 A→B 를 연속으로 연 뒤 닫기가 A 를 다시 열어
 * 목록으로 돌아가는 데 두 번이 걸린다.
 *
 * 판정은 동기 ref 다. 같은 틱에 두 번 열어도 두 번째 호출이 첫 번째를 본다.
 *
 * 소비 컴포넌트는 `useSearchParams` 를 쓰므로 상위에 Suspense 경계가 필요하다.
 */
const useDetailQuerySession = (key: DetailQueryKey, { openedOutside = false }: Options = {}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = searchParams.get(key);
  /** 우리가 history entry 를 쌓아 열었는지. 참일 때만 닫기가 뒤로가기를 쓴다. */
  const openedHere = useRef(false);
  const openRef = useRef(activeId != null);
  const searchParamsRef = useRef(searchParams);

  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  useEffect(() => {
    const open = activeId != null;
    if (openedOutside && !openRef.current && open) openedHere.current = true;
    openRef.current = open;
    // 뒤로가기처럼 외부 요인으로 닫혀도 되돌린다. 그대로 두면 다음 닫기가 우리가 쌓지
    // 않은 entry 로 돌아간다.
    if (!open) openedHere.current = false;
  }, [activeId, openedOutside]);

  const goto = useCallback(
    (id: string | null) => {
      const href = detailQueryHref(
        { pathname, search: searchParamsRef.current.toString() },
        key,
        id,
      );

      if (!id) {
        openRef.current = false;
        replaceCurrentUrl(href);
        return;
      }
      if (openRef.current) {
        replaceCurrentUrl(href);
        return;
      }
      openedHere.current = true;
      openRef.current = true;
      pushCurrentUrl(href);
    },
    [key, pathname],
  );

  const close = useCallback(() => {
    if (openedHere.current) {
      openedHere.current = false;
      openRef.current = false;
      router.back();
      return;
    }
    goto(null);
  }, [goto, router]);

  return { activeId, open: activeId != null, close, goto };
};

export { useDetailQuerySession };
