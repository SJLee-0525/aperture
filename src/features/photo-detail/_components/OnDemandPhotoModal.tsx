"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { ExifPanelSkeleton } from "@/features/photo-detail/_components/ExifPanelSkeleton";
import { mergePhotoCache } from "@/features/photo-detail/_lib/photo-cache";
import type { PhotoDetailPayload } from "@/features/photo-detail/_lib/photo-detail-payload";
import { revivePhoto } from "@/features/photo-detail/_lib/photo-detail-payload";
import { useMounted } from "@/hooks/use-mounted";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { replaceCurrentUrl } from "@/lib/navigation/replace-current-url";
import type { Photo } from "@/types/photo";
import type { Tag } from "@/types/tag";
import { setCursorLoading } from "@/utils/custom-cursor-events";

import styles from "./OnDemandPhotoModal.module.css";

const EMPTY_TAGS: Tag[] = [];
const loadPhotoModal = () => import("@/features/photo-detail/_components/PhotoModal");
const PhotoModal = dynamic(() => loadPhotoModal().then((module) => module.PhotoModal), {
  ssr: false,
});

/** 타일·위치 리스트가 hover/focus 시점에 모달 청크를 미리 받게 한다 — 첫 클릭 지연 제거. */
const preloadPhotoModal = () => {
  void loadPhotoModal();
};

type Props = {
  photoIds: string[];
  endpoint: string;
  initialTags?: Tag[];
};

const OnDemandPhotoModal = ({ photoIds, endpoint, initialTags = EMPTY_TAGS }: Props) => {
  const { dict } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("photo");
  const [photosById, setPhotosById] = useState<Map<string, Photo>>(() => new Map());
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [readyId, setReadyId] = useState<string | null>(null);
  const wasOpen = useRef(activeId != null);
  const openedHere = useRef(false);
  // fetch effect는 원시값(activeId·retry)만 의존한다. Map/배열 정체성을 의존성에 두면
  // 응답이 stale 이웃 id를 영원히 채우지 못할 때(ISR 목록·API 목록 불일치) 무한 재요청이 된다.
  // 캐시·태그 수신 여부는 ref 스냅샷으로 읽는다.
  const cacheRef = useRef(photosById);
  const tagsLoadedRef = useRef(initialTags.length > 0);

  // fetch effect보다 먼저 선언 — 같은 커밋에서 캐시 스냅샷이 항상 최신으로 동기화된다.
  useEffect(() => {
    cacheRef.current = photosById;
  }, [photosById]);

  useEffect(() => {
    const open = activeId != null;
    if (!wasOpen.current && open) openedHere.current = true;
    if (!open) openedHere.current = false;
    wasOpen.current = open;
  }, [activeId]);

  const close = useCallback(() => {
    setReadyId(null);
    if (openedHere.current) {
      openedHere.current = false;
      router.back();
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("photo");
    const query = params.toString();
    replaceCurrentUrl(query ? `${window.location.pathname}?${query}` : window.location.pathname);
  }, [router, searchParams]);

  useEffect(() => {
    if (!activeId || !photoIds.includes(activeId)) return;

    void loadPhotoModal();
    const index = photoIds.indexOf(activeId);
    const neededIds = [
      photoIds[(index - 1 + photoIds.length) % photoIds.length],
      activeId,
      photoIds[(index + 1) % photoIds.length],
    ].filter((id): id is string => id != null);
    if (tagsLoadedRef.current && neededIds.every((id) => cacheRef.current.has(id))) return;

    const controller = new AbortController();

    fetch(`${endpoint}/${encodeURIComponent(activeId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Photo detail request failed: ${response.status}`);
        return (await response.json()) as PhotoDetailPayload;
      })
      .then((payload) => {
        const revived = payload.photos.map(revivePhoto);
        setPhotosById((current) => mergePhotoCache(current, revived));
        setTags(payload.tags);
        tagsLoadedRef.current = true;
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setFailedId(activeId);
      });

    return () => controller.abort();
  }, [activeId, endpoint, photoIds, retry]);

  const photos = useMemo(
    () => photoIds.flatMap((id) => (photosById.has(id) ? [photosById.get(id)!] : [])),
    [photoIds, photosById],
  );
  const activePhoto = activeId ? photosById.get(activeId) : undefined;
  const knownActiveId = activeId ? photoIds.includes(activeId) : false;
  const mounted = useMounted();
  // 로딩 프레임 → 실제 모달 전환 중에도 한 소유자가 잠금을 계속 유지한다.
  useScrollLock(activeId != null);

  useEffect(() => {
    if (!activeId) return;
    const loadingId = `photo-detail:${activeId}`;
    const pending = readyId !== activeId && failedId !== activeId;
    setCursorLoading(loadingId, pending);
    return () => setCursorLoading(loadingId, false);
  }, [activeId, failedId, readyId]);

  if (!activeId) return null;

  return (
    <>
      {activePhoto ? (
        <PhotoModal
          photos={photos}
          tags={tags}
          photoIds={photoIds}
          onClose={close}
          animateOnOpen={false}
          revealed={readyId === activeId}
          onImageReady={setReadyId}
        />
      ) : null}
      {readyId !== activeId && mounted
        ? createPortal(
            <div
              className={styles.pending}
              role="dialog"
              aria-modal="true"
              aria-label={dict.photoLoadingLabel}
            >
              <div className={styles.scrim} aria-hidden="true" />
              <div className={styles.frame} data-photo-pending-frame>
                <div className={styles.photo} data-photo-modal-image-area="pending">
                  <button
                    type="button"
                    className={styles.close}
                    aria-label={dict.closeLabel}
                    onClick={close}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="17"
                      height="17"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      aria-hidden="true"
                    >
                      <path d="M5 5l14 14M19 5L5 19" />
                    </svg>
                  </button>
                  <div className={styles.state}>
                    {failedId === activeId || !knownActiveId ? (
                      <>
                        <p>{dict.photoLoadError}</p>
                        {knownActiveId ? (
                          <button
                            type="button"
                            className={styles.retry}
                            onClick={() => {
                              setFailedId(null);
                              setRetry((value) => value + 1);
                            }}
                          >
                            {dict.errorRetry}
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <span className={styles.spinner} aria-label={dict.photoLoadingLabel} />
                    )}
                  </div>
                </div>
                <aside
                  id="photo-pending-scroll-container"
                  className={styles.panel}
                  data-custom-scroll-container
                  aria-hidden="true"
                >
                  <span className={styles.handle} />
                  <ExifPanelSkeleton tagCount={3} />
                </aside>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

export { OnDemandPhotoModal, preloadPhotoModal };
