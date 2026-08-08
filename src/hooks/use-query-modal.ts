"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { pushCurrentUrl, replaceCurrentUrl } from "@/lib/navigation/replace-current-url";

/**
 * URL 쿼리(?param=id)로 열리는 상세 모달 상태 — 딥링크·검색 결과에서 항목을 바로 열 수 있게 한다.
 * id 매칭 항목을 돌려주고, select/close 는 쿼리만 갱신(스크롤 유지). ESC·스크림 닫기는 Modal 이 처리.
 * usePhotoModal(?photo=)의 단일 항목 버전 — 음악 연주(?work=)·수상(?award=)·개발 프로젝트(?project=) 공용.
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
  const openedHere = useRef(false);
  const searchParamsRef = useRef(searchParams);

  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const activeId = searchParams.get(param);
  const active = activeId ? (items.find((item) => item.id === activeId) ?? null) : null;

  const select = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      if (id) {
        params.set(param, id);
        openedHere.current = true;
      } else {
        params.delete(param);
      }
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (id) pushCurrentUrl(href);
      else replaceCurrentUrl(href);
    },
    [pathname, param],
  );

  const close = useCallback(() => {
    if (openedHere.current) {
      openedHere.current = false;
      router.back();
      return;
    }
    select(null);
  }, [router, select]);

  return { active, open: active != null, select, close };
};

export { useQueryModal };
