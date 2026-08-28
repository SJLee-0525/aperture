"use client";

import { AnimatePresence, m } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/CloseIcon";
import { ExifPanelSkeleton } from "@/features/photo-detail/_components/ExifPanelSkeleton";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useOnDemandPhotoDetails } from "@/features/photo-detail/_hooks/use-on-demand-photo-details";
import { useDetailQuerySession } from "@/hooks/use-detail-query-session";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useMounted } from "@/hooks/use-mounted";
import { useScrollLock } from "@/hooks/use-scroll-lock";

import { setCursorLoading } from "@/features/pointer-chrome/_lib/pointer-chrome-events";

import { DETAIL_QUERY_KEYS } from "@/constants/routes";

import type { Tag } from "@/types/tag";

import styles from "./OnDemandPhotoModal.module.css";

/** PhotoModal 의 진입 연출과 같은 값. 두 경로의 열림이 같은 속도로 느껴져야 한다. */
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * 로딩 프레임을 띄우기까지 기다리는 시간.
 *
 * 바로 열리는 사진에 스크림이 먼저 떴다가 모달이 뒤따르면 한 번 여는 동안 두 번 열리는
 * 것처럼 보인다. 이 시간 안에 끝나면 앨범 상세와 똑같이 스크림과 패널이 함께 등장한다.
 */
const PENDING_DELAY_MS = 180;

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
  const { activeId, close: closeSession } = useDetailQuerySession(DETAIL_QUERY_KEYS.photo, {
    openedOutside: true,
  });
  const { failed, photos, retry, tags } = useOnDemandPhotoDetails(
    activeId,
    photoIds,
    endpoint,
    initialTags,
  );
  const [readyId, setReadyId] = useState<string | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(null);
  /** 이번 열기에서 로딩 프레임이 등장했는지. 한 번 뜨면 닫을 때까지 유지한다. */
  const [pendingShown, setPendingShown] = useState(false);

  /* 뒤로가기로 닫으면 close() 를 거치지 않는다. 다 본 사진의 id 가 남아 있으면 같은 사진을
     다시 열 때 판정이 이전 열기의 상태를 그대로 물려받는다. */
  if (openedId !== activeId) {
    setOpenedId(activeId);
    setReadyId(null);
    setPendingShown(false);
  }

  const close = useCallback(() => {
    closeSession();
  }, [closeSession]);

  useEffect(() => {
    if (activeId && photoIds.includes(activeId)) void loadPhotoModal();
  }, [activeId, photoIds]);
  const knownActiveId = activeId ? photoIds.includes(activeId) : false;
  const mounted = useMounted();
  const waiting = activeId != null && readyId !== activeId;
  const pendingRef = useFocusTrap(pendingShown && waiting && mounted);
  // 로딩 프레임도 닫을 수 있어야 한다. 사진이 늦게 오는 동안 Escape 가 듣지 않으면
  // 방문자는 닫기 버튼을 찾기 전까지 갇힌다.
  useEscapeKey(pendingShown && waiting, close);

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setTimeout(() => setPendingShown(true), PENDING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [waiting]);
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
          /* 로딩 프레임이 뜨지 않은 열기에서는 이 모달이 스크림과 패널을 함께 띄운다.
             프레임이 이미 스크림을 올렸다면 배경은 그대로 두고 패널만 등장한다. */
          animateOnOpen={!pendingShown}
          revealed={readyId === activeId}
          onImageReady={setReadyId}
          chatTarget={chatTarget}
        />
      ) : null}
      {mounted
        ? createPortal(
            <AnimatePresence>
              {pendingShown && waiting ? (
                /* 바깥에는 퇴장을 주지 않는다. 사진이 도착하면 그 아래 모달이 같은 스크림을
                   이미 불투명하게 그리고 있어, 여기서 함께 페이드하면 전면 backdrop-filter 가
                   두 겹으로 합성된다. */
                <m.div
                  ref={pendingRef}
                  className={styles.pending}
                  role="dialog"
                  aria-modal="true"
                  aria-label={dict.photoLoadingLabel}
                  tabIndex={-1}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.22, ease: EASE }}
                >
                  <div className={styles.scrim} aria-hidden="true" />
                  {/* 스케일은 여기에 주지 않는다. 사진이 도착하면 실제 패널이 같은 자리에서
                      스케일로 등장하므로, 로딩 프레임까지 확대하면 등장 연출이 두 번 보인다. */}
                  <m.div
                    className={styles.frame}
                    data-photo-pending-frame
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: EASE }}
                  >
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
                  </m.div>
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
