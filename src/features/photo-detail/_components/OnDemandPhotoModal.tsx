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
  const { activePhoto, failed, photos, retry, tags } = useOnDemandPhotoDetails(
    activeId,
    photoIds,
    endpoint,
    initialTags,
  );
  const [readyId, setReadyId] = useState<string | null>(null);
  /** 현재 detail query session 을 처음 연 사진. 사진 교체로는 바꾸지 않는다. */
  const [openedId, setOpenedId] = useState<string | null>(null);
  /** 로딩 프레임이 현재 소유한 사진. 사진이 준비될 때까지 재시도 전환도 유지한다. */
  const [pendingId, setPendingId] = useState<string | null>(null);

  /* 뒤로가기로 닫으면 close() 를 거치지 않는다. query 의 null 경계에서 세션 상태를
     초기화하되, 열린 채 다른 사진으로 이동하는 것은 새 진입이 아니라 교체로 취급한다. */
  if (openedId == null && activeId != null) {
    setOpenedId(activeId);
    setReadyId(null);
    setPendingId(null);
  } else if (openedId != null && activeId == null) {
    setOpenedId(null);
    setReadyId(null);
    setPendingId(null);
  }

  const close = useCallback(() => {
    closeSession();
  }, [closeSession]);

  useEffect(() => {
    if (activeId && photoIds.includes(activeId)) void loadPhotoModal();
  }, [activeId, photoIds]);
  const knownActiveId = activeId ? photoIds.includes(activeId) : false;
  const mounted = useMounted();
  /* 세션 첫 사진과 상세 데이터 자체가 없는 사진은 로딩 프레임이 맡는다. 상세가 캐시된
     미로딩 사진은 열린 모달 안의 이미지 로더가 맡아 셸을 다시 숨기지 않는다. */
  const shouldStartPending = activeId != null && (readyId == null || activePhoto == null);
  const pendingOpen = activeId != null && pendingId === activeId && readyId !== activeId;
  const pendingRef = useFocusTrap(pendingOpen && mounted);
  // 로딩 프레임도 닫을 수 있어야 한다. 사진이 늦게 오는 동안 Escape 가 듣지 않으면
  // 방문자는 닫기 버튼을 찾기 전까지 갇힌다.
  useEscapeKey(pendingOpen, close);

  useEffect(() => {
    if (!activeId || !shouldStartPending || pendingId === activeId) return;
    const timer = window.setTimeout(() => setPendingId(activeId), PENDING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [activeId, pendingId, shouldStartPending]);
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
          animateOnOpen={pendingId !== activeId}
          revealed={readyId != null}
          onImageReady={(id) => {
            setReadyId(id);
            setPendingId((current) => (current === id ? null : current));
          }}
          chatTarget={chatTarget}
        />
      ) : null}
      {mounted
        ? createPortal(
            <AnimatePresence>
              {pendingOpen ? (
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
