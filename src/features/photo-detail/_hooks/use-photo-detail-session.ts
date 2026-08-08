"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { replaceCurrentUrl } from "@/lib/navigation/replace-current-url";

/**
 * 사진 상세 세션의 URL·history 규칙.
 * eager와 on-demand adapter가 같은 닫기·이동 동작을 사용하도록 데이터 로딩과 분리한다.
 *
 * @returns {{ activeId: string | null; close: () => void; goto: (id: string | null) => void }}
 */
const usePhotoDetailSession = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("photo");
  const wasOpen = useRef(activeId != null);
  const openedHere = useRef(false);

  useEffect(() => {
    const open = activeId != null;
    if (!wasOpen.current && open) openedHere.current = true;
    if (!open) openedHere.current = false;
    wasOpen.current = open;
  }, [activeId]);

  const goto = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("photo", id);
      else params.delete("photo");

      const query = params.toString();
      replaceCurrentUrl(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, searchParams],
  );

  const close = useCallback(() => {
    if (openedHere.current) {
      openedHere.current = false;
      router.back();
      return;
    }
    goto(null);
  }, [goto, router]);

  return { activeId, close, goto };
};

export { usePhotoDetailSession };
