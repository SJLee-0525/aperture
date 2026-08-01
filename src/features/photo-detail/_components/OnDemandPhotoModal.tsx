"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/CloseIcon";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { ExifPanelSkeleton } from "@/features/photo-detail/_components/ExifPanelSkeleton";
import { useOnDemandPhotoDetails } from "@/features/photo-detail/_hooks/use-on-demand-photo-details";
import { usePhotoDetailSession } from "@/features/photo-detail/_hooks/use-photo-detail-session";
import { useMounted } from "@/hooks/use-mounted";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useScrollLock } from "@/hooks/use-scroll-lock";
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
  const { activeId, close: closeSession } = usePhotoDetailSession();
  const { activePhoto, failed, photos, retry, tags } = useOnDemandPhotoDetails(
    activeId,
    photoIds,
    endpoint,
    initialTags,
  );
  const [readyId, setReadyId] = useState<string | null>(null);

  const close = useCallback(() => {
    setReadyId(null);
    closeSession();
  }, [closeSession]);

  useEffect(() => {
    if (activeId && photoIds.includes(activeId)) void loadPhotoModal();
  }, [activeId, photoIds]);
  const knownActiveId = activeId ? photoIds.includes(activeId) : false;
  const mounted = useMounted();
  const pendingOpen = activeId != null && readyId !== activeId;
  const pendingRef = useFocusTrap(pendingOpen && mounted);
  // 로딩 프레임 → 실제 모달 전환 중에도 한 소유자가 잠금을 계속 유지한다.
  useScrollLock(activeId != null);

  useEffect(() => {
    if (!activeId) return;
    const loadingId = `photo-detail:${activeId}`;
    const pending = readyId !== activeId && !failed;
    setCursorLoading(loadingId, pending);
    return () => setCursorLoading(loadingId, false);
  }, [activeId, failed, readyId]);

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
      {pendingOpen && mounted
        ? createPortal(
            <div
              ref={pendingRef}
              className={styles.pending}
              role="dialog"
              aria-modal="true"
              aria-label={dict.photoLoadingLabel}
              tabIndex={-1}
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
                    <CloseIcon />
                  </button>
                  <div className={styles.state}>
                    {failed || !knownActiveId ? (
                      <>
                        <p>{dict.photoLoadError}</p>
                        {knownActiveId ? (
                          <button type="button" className={styles.retry} onClick={retry}>
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
