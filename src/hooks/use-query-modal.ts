"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { pushCurrentUrl, replaceCurrentUrl } from "@/lib/navigation/replace-current-url";

/**
 * URL 쿼리(?param=id)로 열리는 상세 모달 상태 — 딥링크·검색 결과에서 항목을 바로 열 수 있게 한다.
 * id 매칭 항목을 돌려주고, select/close 는 쿼리만 갱신(스크롤 유지). ESC·스크림 닫기는 Modal 이 처리.
 * usePhotoDetailSession(?photo=)의 단일 항목 버전 — 음악 연주(?work=)·수상(?award=)·개발 프로젝트(?project=) 공용.
 * 소비 컴포넌트는 useSearchParams 를 쓰므로 상위에 Suspense 경계가 필요하다.
 *
 * @param {string} param
 * @param {T[]} items
 * @returns {{ active: T | null; open: boolean; select: (id: string | null) => void; close: () => void }}
 */
const useQueryModal = <T extends { id: string }>(param: string, items: T[]) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = searchParams.get(param);
  /** 우리가 history entry 를 쌓아 열었는지. 참일 때만 닫기가 뒤로가기를 쓴다. */
  const openedHere = useRef(false);
  /**
   * 지금 모달이 열려 있는지. select 가 동기적으로 갱신하므로 한 틱에 두 번 열어도
   * 두 번째 호출이 첫 번째를 본다. effect 로만 갱신하면 그 사이 값이 낡는다.
   */
  const openRef = useRef(activeId != null);
  const searchParamsRef = useRef(searchParams);

  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  // 뒤로가기처럼 외부 요인으로 닫혀도 상태를 되돌린다. 리셋하지 않으면 다음 닫기가
  // 우리가 쌓지 않은 history entry 로 돌아간다.
  useEffect(() => {
    const open = activeId != null;
    openRef.current = open;
    if (!open) openedHere.current = false;
  }, [activeId]);

  const active = activeId ? (items.find((item) => item.id === activeId) ?? null) : null;

  const select = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      if (id) params.set(param, id);
      else params.delete(param);
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;

      if (!id) {
        openRef.current = false;
        replaceCurrentUrl(href);
        return;
      }
      // 열린 상태에서 다른 항목으로 옮기는 것은 새 진입이 아니다. push 하면 A→B 를
      // 연속으로 연 뒤 닫기가 A 를 다시 열어 두 번 눌러야 목록으로 돌아간다.
      if (openRef.current) {
        replaceCurrentUrl(href);
        return;
      }
      openedHere.current = true;
      openRef.current = true;
      pushCurrentUrl(href);
    },
    [pathname, param],
  );

  // 비공개로 바뀐 항목의 공유 링크처럼 매칭되는 항목이 없으면 모달이 열리지 않는데 쿼리는
  // URL 에 남는다. 목록만 보이는 화면에서 왜 안 열리는지 알 수 없고 뒤로가기 동작도 어긋난다.
  useEffect(() => {
    if (activeId == null || active != null) return;
    select(null);
  }, [activeId, active, select]);

  const close = useCallback(() => {
    if (openedHere.current) {
      openedHere.current = false;
      openRef.current = false;
      router.back();
      return;
    }
    select(null);
  }, [router, select]);

  return { active, open: active != null, select, close };
};

export { useQueryModal };
