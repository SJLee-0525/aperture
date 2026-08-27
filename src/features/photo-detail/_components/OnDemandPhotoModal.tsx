"use client";

import { AnimatePresence, m } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/CloseIcon";
import { ExifPanelSkeleton } from "@/features/photo-detail/_components/ExifPanelSkeleton";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useOnDemandPhotoDetails } from "@/features/photo-detail/_hooks/use-on-demand-photo-details";
import { usePhotoDetailSession } from "@/features/photo-detail/_hooks/use-photo-detail-session";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useMounted } from "@/hooks/use-mounted";
import { useScrollLock } from "@/hooks/use-scroll-lock";

import { setCursorLoading } from "@/utils/custom-cursor-events";

import type { Tag } from "@/types/tag";

import styles from "./OnDemandPhotoModal.module.css";

/** PhotoModal 의 진입 연출과 같은 값. 두 경로의 열림이 같은 속도로 느껴져야 한다. */
const EASE = [0.22, 1, 0.36, 1] as const;

const EMPTY_TAGS: Tag[] = [];
const loadPhotoModal = () => import("@/features/photo-detail/_components/PhotoModal");
const PhotoModal = dynamic(() => loadPhotoModal().then((module) => module.PhotoModal), {
  ssr: false,
});

/**
 * 타일·위치 리스트가 hover/focus 시점에 모달 청크를 미리 받게 한다 — 첫 클릭 지연 제거.
 *
 * @returns {void}
 */
const preloadPhotoModal = () => {
  void loadPhotoModal();
};

type Props = {
  photoIds: string[];
  endpoint: string;
  initialTags?: Tag[];
  /**
   * 열린 사진을 챗봇 입력창에 표시할지 결정한다.
   * 작업 페이지에서만 사용하며 지도 모달에서는 끈다.
   */
  chatTarget?: boolean;
};

const OnDemandPhotoModal = ({
  photoIds,
  endpoint,
  initialTags = EMPTY_TAGS,
  chatTarget,
}: Props) => {
  const { dict } = useLang();
  const { activeId, close: closeSession } = usePhotoDetailSession();
  const { activePhoto, failed, photos, retry, tags } = useOnDemandPhotoDetails(
    activeId,
    photoIds,
    endpoint,
    initialTags,
  );
  const [readyId, setReadyId] = useState<string | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(null);

  /* 뒤로가기로 닫으면 close() 를 거치지 않는다. 다 본 사진의 id 가 남아 있으면 같은 사진을
     다시 열 때 로딩 프레임이 뜨지 않고, 그 프레임이 여는 스크림 페이드도 함께 사라진다. */
  if (openedId !== activeId) {
    setOpenedId(activeId);
    setReadyId(null);
  }

  const close = useCallback(() => {
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

  /* 닫힐 때 언마운트하면 PhotoModal 안의 AnimatePresence 가 퇴장을 돌릴 기회를 잃는다.
     상세를 한 번이라도 받아 두면 계속 마운트해 두고 activeId 만 내린다. */
  if (!activeId && photos.length === 0) return null;

  return (
    <>
      {photos.length > 0 ? (
        <PhotoModal
          photos={photos}
          tags={tags}
          photoIds={photoIds}
          onClose={close}
          animateOnOpen={false}
          revealed={readyId === activeId}
          onImageReady={setReadyId}
          chatTarget={chatTarget}
        />
      ) : null}
      {mounted
        ? createPortal(
            <AnimatePresence>
              {pendingOpen ? (
                <m.div
                  ref={pendingRef}
                  className={styles.pending}
                  role="dialog"
                  aria-modal="true"
                  aria-label={dict.photoLoadingLabel}
                  tabIndex={-1}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: EASE }}
                >
                  {/* 실제 모달이 이미 같은 스크림을 그리고 있으면 겹쳐 그리지 않는다.
                  전면 backdrop-filter 를 두 겹으로 합성하면 전환 프레임이 떨어진다. */}
                  {activePhoto ? null : <div className={styles.scrim} aria-hidden="true" />}
                  {/* 스케일은 여기에 주지 않는다. 사진이 도착하면 실제 패널이 같은 자리에서
                      스케일로 등장하므로, 로딩 프레임까지 확대하면 한 번 여는 동안 등장 연출이
                      두 번 보인다. */}
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
                          <span className={styles.spinner} aria-hidden="true" />
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
                </m.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
};

export { OnDemandPhotoModal, preloadPhotoModal };
