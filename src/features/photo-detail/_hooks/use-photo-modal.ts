"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import type { Photo } from "@/types/photo";

/**
 * 사진 상세 모달 상태 — URL(?photo=id)이 단일 출처(딥링크·공유).
 * prev/next는 넘겨받은 photos 배열을 순환, 키보드(←/→/ESC) 지원.
 */
const usePhotoModal = (photos: Photo[]) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeId = searchParams.get("photo");
  const index = activeId ? photos.findIndex((photo) => photo.id === activeId) : -1;
  const photo = index >= 0 ? photos[index] : null;
  const open = photo != null;
  const wasOpen = useRef(open);
  const openedHere = useRef(false);

  useEffect(() => {
    if (!wasOpen.current && open) openedHere.current = true;
    if (!open) openedHere.current = false;
    wasOpen.current = open;
  }, [open]);

  const goto = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("photo", id);
      } else {
        params.delete("photo");
      }
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (id) router.replace(href, { scroll: false });
      else {
        window.history.replaceState(window.history.state, "", href);
        window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
      }
    },
    [router, pathname, searchParams],
  );

  const close = useCallback(() => {
    if (openedHere.current) {
      openedHere.current = false;
      router.back();
      return;
    }
    goto(null);
  }, [router, goto]);

  const step = useCallback(
    (delta: number) => {
      if (index < 0 || photos.length === 0) return;
      const nextIndex = (index + delta + photos.length) % photos.length;
      goto(photos[nextIndex].id);
    },
    [index, photos, goto],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowLeft") step(-1);
      else if (event.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, step]);

  return {
    photo,
    open,
    close,
    next: () => step(1),
    prev: () => step(-1),
  };
};

export { usePhotoModal };
