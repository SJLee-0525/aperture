"use client";

import { AnimatePresence, m } from "motion/react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/CloseIcon";
import { ExifStrip } from "@/components/ExifStrip";
import { Icon } from "@/components/Icon";
import { ExifPanel } from "@/features/photo-detail/_components/ExifPanel";
import { ExifPanelSkeleton } from "@/features/photo-detail/_components/ExifPanelSkeleton";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { usePhotoImageStatus } from "@/features/photo-detail/_hooks/use-photo-image-status";
import { usePhotoModal } from "@/features/photo-detail/_hooks/use-photo-modal";
import { usePhotoModalViewport } from "@/features/photo-detail/_hooks/use-photo-modal-viewport";
import { usePhotoPanelSheet } from "@/features/photo-detail/_hooks/use-photo-panel-sheet";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useImageZoom } from "@/hooks/use-image-zoom";
import { useMounted } from "@/hooks/use-mounted";
import { useOverlayDrag } from "@/hooks/use-overlay-drag";
import { useOverlayLayer } from "@/hooks/use-overlay-layer";
import { useRegisterChatScreenTarget } from "@/hooks/use-register-chat-screen-target";
import { useScrollLock } from "@/hooks/use-scroll-lock";

import { buildPhotoModalSlides } from "@/features/photo-detail/_lib/photo-modal-slides";
import { readPhotoNeighbors } from "@/features/photo-detail/_lib/photo-neighbors";

import { DETAIL_QUERY_KEYS } from "@/constants/routes";
import { pickText } from "@/lib/i18n/pick-text";

import type { Photo } from "@/types/photo";
import type { Tag } from "@/types/tag";

import styles from "./PhotoModal.module.css";

type Props = {
  photos: Photo[];
  tags: Tag[];
  photoIds?: string[];
  onClose?: () => void;
  /** 배경을 페이드로 띄울지. 패널은 이 값과 무관하게 `revealed` 를 따라 들어온다. */
  animateOnOpen?: boolean;
  revealed?: boolean;
  onImageReady?: (id: string) => void;
  chatTarget?: boolean;
};

const EASE = [0.22, 1, 0.36, 1] as const;
const CHROME_TRANSITION = { duration: 0.2, ease: EASE } as const;

/**
 * 사진 상세 — 데스크톱 라이트박스 / 모바일 바텀시트(탭으로 peek↔확장).
 * document.body로 포털 렌더 → sticky 헤더 등 어떤 조상 스태킹 컨텍스트에도 안 갇히고 항상 최상단.
 * AnimatePresence로 열림/닫힘 페이드+스케일(exit 포함). URL(?photo=)이 열림 상태의 단일 출처.
 * 이전·현재·다음 세 장을 트랙에 올려 모바일에서 좌우로 끌어 넘길 수 있게 한다.
 *
 * @param props.chatTarget 열린 사진을 챗봇 화면 문맥으로 등록할지 여부.
 */
const PhotoModal = ({
  photos,
  tags,
  photoIds,
  onClose,
  animateOnOpen = true,
  revealed = true,
  onImageReady,
  chatTarget = false,
}: Props) => {
  const { dict, lang } = useLang();
  const sheet = usePhotoPanelSheet();
  const images = usePhotoImageStatus();

  const searchParams = useSearchParams();

  // usePhotoModal 이 반환하는 photo 로는 그 호출의 인자를 만들 수 없어 URL 에서 직접 읽는다.
  const activePhotoId = searchParams.get(DETAIL_QUERY_KEYS.photo);
  const activeStatus = activePhotoId != null ? images.statusOf(activePhotoId) : undefined;

  // 실패도 결판이 난 상태다. 스피너를 걷고 오류를 보여 준다.
  const imgLoaded = activeStatus != null;
  const imgFailed = activeStatus === "failed";
  const mobile = usePhotoModalViewport();
  const navigationLocked = mobile && sheet.expanded;
  /* 열려 있는 동안만 stack 에 오른다. 이 컴포넌트는 퇴장 연출을 위해 닫힌 뒤에도 마운트된
     채로 남으므로, 마운트 여부로 판정하면 다른 오버레이가 Escape 를 넘겨받지 못한다. */
  const isTopLayer = useOverlayLayer(activePhotoId != null);
  const showPhotoChrome = !navigationLocked && sheet.chromeVisible;
  const {
    photo,
    open,
    close,
    next,
    prev,
    navigationIds,
    index: photoIndex,
  } = usePhotoModal(
    photos,
    !navigationLocked && imgLoaded,
    undefined,
    photoIds,
    onClose,
    isTopLayer,
  );
  useRegisterChatScreenTarget(
    chatTarget && open && photo
      ? { type: "photo", id: photo.id, label: pickText(photo.title, lang) }
      : null,
  );
  const [seenId, setSeenId] = useState<string | undefined>(photo?.id);
  const dismissSurfaceRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);

  // 사진이 바뀌면(prev/next·열기) 패널과 크롬을 기본 상태로 — effect 없이 render-time reseed.
  if (photo && photo.id !== seenId) {
    setSeenId(photo.id);
    sheet.reset();
  }
  // useDialog 를 쓰지 않는다. 셋의 활성 조건이 서로 다르다 — 트랩은 진입 애니메이션이
  // 끝난 뒤(open && revealed), 스크롤 잠금은 열리는 즉시(open), 최상위 판정은 사진이
  // 있는 동안(photos.length)이다. 하나로 묶으면 셋 중 둘의 시점이 바뀐다.
  const trapRef = useFocusTrap(open && revealed);
  const mounted = useMounted();
  useScrollLock(open);

  const alt = photo ? pickText(photo.title, lang) : "";
  // 렌더마다(크롬 토글·스크롤 상태 변화) 반복되는 id 조회는 Map으로 — O(사진×이웃), O(태그×사진태그) 제거.
  const photoById = useMemo(() => new Map(photos.map((item) => [item.id, item])), [photos]);
  const tagById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  const neighbors = readPhotoNeighbors(navigationIds, photoById, photoIndex);
  // 버튼과 방향키는 아직 못 받은 사진으로도 이동한다. 온디맨드 경로가 그 상태를 로딩
  // 프레임으로 받아 실패하면 재시도까지 보여 준다. 이웃을 요구하면 그 출구가 막힌다.
  const canNavigatePrev = imgLoaded && !navigationLocked;
  const canNavigateNext = imgLoaded && !navigationLocked;
  // 이웃이 아직 없으면 밀어 보여 줄 그림이 없다. 넘기기는 하되 애니메이션만 건너뛴다.
  const canPeekPrev =
    neighbors.previous != null && images.statusOf(neighbors.previous.id) === "loaded";
  const canPeekNext = neighbors.next != null && images.statusOf(neighbors.next.id) === "loaded";
  const tagLabels = photo
    ? photo.tags.map((id) => {
        const found = tagById.get(id);
        return found ? pickText(found, lang) : id;
      })
    : [];
  const slides = photo ? buildPhotoModalSlides(photo, neighbors, images.retryCountOf) : [];

  const {
    stageRef: zoomSurfaceRef,
    zoomed,
    reset: resetZoom,
    handleStageClick,
  } = useImageZoom({
    enabled: open && revealed && isTopLayer && !navigationLocked,
    // 재시도는 슬라이드 key 를 바꿔 표면 노드를 교체하므로 재시도 횟수까지
    // resetKey 에 포함해야 리스너가 새 노드로 옮겨 붙는다.
    resetKey: photo ? `${photo.id}@${images.retryCountOf(photo.id)}` : "",
    getMaxScale: (stage) => {
      if (!photo) return 3;
      const { w, h } = photo.image;
      // contain 맞춤이라 실제 표시 폭은 표면 폭보다 작을 수 있다. 저장 해상도를
      // 넘는 확대는 뭉개지므로 표시 폭 대비 픽셀 밀도까지만 열되 최소 2배는 허용한다.
      const displayedWidth = Math.min(stage.offsetWidth, (stage.offsetHeight * w) / h);
      if (!Number.isFinite(displayedWidth) || displayedWidth <= 0) return 3;
      return Math.min(4, Math.max(2, w / displayedWidth));
    },
  });

  const {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    consumeDragged,
    swipeSurfaceRef: trackRef,
  } = useOverlayDrag({
    enabled: mobile && open && revealed && !sheet.expanded && !zoomed,
    onDismiss: close,
    surfaceRef: dismissSurfaceRef,
    canStart: (target) => {
      const element = target instanceof Element ? target : null;
      if (element?.closest("button")) return false;
      const panel = element?.closest("aside");
      return !panel || panel.scrollTop <= 1;
    },
    canSwipeStart: (target) =>
      target instanceof Element &&
      target.closest("[data-photo-modal-track]") != null &&
      target.closest("button") == null,
    canSwipeCommit: (direction) => (direction === 1 ? canNavigateNext : canNavigatePrev),
    canSwipePeek: (direction) => (direction === 1 ? canPeekNext : canPeekPrev),
    getSwipeStageWidth: () => photoRef.current?.clientWidth ?? 0,
    onSwipe: (direction) => (direction === 1 ? next() : prev()),
  });

  useEffect(() => {
    const node = photoRef.current;
    if (!open || !node) return;
    const prevent = (event: Event) => event.preventDefault();

    // Chrome DevTools 모바일 에뮬레이션은 데스크톱 contextmenu 경로를 사용할 수 있어
    // React 버블 핸들러보다 앞선 네이티브 캡처 단계에서 이미지 기본 동작을 차단한다.
    node.addEventListener("contextmenu", prevent, true);
    node.addEventListener("dragstart", prevent, true);
    node.addEventListener("selectstart", prevent, true);
    return () => {
      node.removeEventListener("contextmenu", prevent, true);
      node.removeEventListener("dragstart", prevent, true);
      node.removeEventListener("selectstart", prevent, true);
    };
  }, [open, photo?.id]);

  // usePhotoModal 의 닫기 리스너(window bubble)보다 먼저 받아, 확대 상태의 ESC 는
  // 닫기 전에 원배율 복귀 단계를 거치게 한다.
  useEffect(() => {
    if (!zoomed || !isTopLayer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      resetZoom(true);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isTopLayer, resetZoom, zoomed]);

  // 온디맨드 경로의 pending 프레임은 이 신호로 걷힌다. 이미 로드된 이웃으로 넘어가면
  // onLoad 가 다시 뛰지 않으므로 로드 여부에서 파생해 알린다.
  // 페인트 뒤에 알리면 이미 준비된 사진 위로 로딩 프레임이 한 프레임 지나간다.
  useLayoutEffect(() => {
    if (activePhotoId != null && imgLoaded) onImageReady?.(activePhotoId);
  }, [activePhotoId, imgLoaded, onImageReady]);

  // 커밋 애니메이션이 남긴 이동값을 페인트 전에 되돌린다. 그대로 두면 새 현재 사진이 아니라
  // 그 다음 슬라이드가 가운데에 보인다.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = "none";
    track.style.transform = "translate3d(0, 0, 0)";
  }, [photo?.id, trackRef]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && photo ? (
        <m.div
          key="photo-modal"
          ref={trapRef}
          tabIndex={-1}
          className={styles.modal}
          data-photo-modal-root
          role={revealed ? "dialog" : undefined}
          aria-modal={revealed ? "true" : undefined}
          aria-label={revealed ? alt : undefined}
          aria-hidden={revealed ? undefined : true}
          inert={!revealed}
          initial={animateOnOpen ? { opacity: 0 } : false}
          // 배경(스크림)에만 걸리는 플래그다. 온디맨드 경로는 pending 프레임이 로딩 전환을
          // 소유하므로, 그 아래 배경까지 투명하게 만들면 pending 제거 직후 페이지가 비친다.
          animate={{ opacity: animateOnOpen ? (revealed ? 1 : 0) : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchCancel}
        >
          {/* 화면 전체를 덮는 요소라 button 이면 트랩의 첫 탭 스톱이 되고, 헤더 닫기 버튼과
              이름이 같아 낭독기의 버튼 목록에 "닫기"가 둘 나온다. 닫기 수단은 그 버튼과
              Escape 가 이미 제공한다. */}
          <div className={styles.scrim} aria-hidden="true" onClick={close} />
          <m.div
            ref={dismissSurfaceRef}
            className={styles.inner}
            data-photo-modal-frame
            /* 패널의 등장·퇴장은 두 경로가 같다. `animateOnOpen` 이 가르는 것은 배경뿐이다.
               온디맨드 경로의 배경은 로딩 프레임이 이미 띄워 둔 상태라 다시 페이드하지 않는다. */
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : 0.985 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            <div
              ref={photoRef}
              className={styles.photo}
              data-photo-modal-image-area="ready"
              onContextMenu={(event) => event.preventDefault()}
              onDragStart={(event) => event.preventDefault()}
              onClick={(event) => {
                // 드래그 뒤 브라우저가 합성하는 click 은 크롬 토글로 보지 않는다.
                if (consumeDragged()) return;
                if ((event.target as HTMLElement).closest("button")) return;
                // 더블탭 확대와 겹치지 않도록 단일탭 동작은 판정 시간만큼 보류된다.
                handleStageClick(() => {
                  if (mobile && sheet.expanded) sheet.collapse();
                  else sheet.toggleChrome();
                });
              }}
            >
              <div ref={trackRef} className={styles.track} data-photo-modal-track>
                {slides.map(({ key, item, current }) => (
                  <div key={key} className={styles.slide} aria-hidden={current ? undefined : true}>
                    {/* 줌 transform 은 이 래퍼만 소유한다. 트랙의 스와이프 transform 과
                        같은 요소에 두면 서로 덮는다. */}
                    <div ref={current ? zoomSurfaceRef : undefined} className={styles.zoomSurface}>
                      {/* 실패한 이미지는 걷어 낸다. 깨진 그림 위에 오류 문구를 겹치지 않는다. */}
                      {item && images.statusOf(item.id) !== "failed" ? (
                        <Image
                          src={item.image.url}
                          alt={current ? alt : ""}
                          fill
                          sizes="100vw"
                          className={styles.img}
                          draggable={false}
                          onContextMenu={(event) => event.preventDefault()}
                          onDragStart={(event) => event.preventDefault()}
                          priority={current}
                          // 이웃은 화면 밖이라 lazy 로 두면 엔진 휴리스틱에 따라 로드가 미뤄지고,
                          // 그러면 스와이프 커밋 조건이 열리지 않는다.
                          loading="eager"
                          onLoad={() => images.markLoaded(item.id)}
                          onError={() => images.markFailed(item.id)}
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              {imgFailed ? (
                <div className={styles.imgError} role="alert">
                  <p>{dict.photoLoadError}</p>
                  <button
                    type="button"
                    className={styles.retry}
                    onClick={() => images.retry(photo.id)}
                  >
                    {dict.errorRetry}
                  </button>
                </div>
              ) : null}
              {imgLoaded ? null : (
                <div className={styles.imgLoader} aria-hidden="true">
                  <span className={styles.spinner} />
                </div>
              )}
              <AnimatePresence>
                {imgLoaded && !imgFailed && showPhotoChrome ? (
                  <m.div
                    key="exif-strip"
                    className={styles.strip}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={CHROME_TRANSITION}
                  >
                    <ExifStrip
                      aperture={photo.exif.aperture}
                      shutter={photo.exif.shutter}
                      iso={photo.exif.iso}
                      glass
                    />
                  </m.div>
                ) : null}
              </AnimatePresence>
              <button
                type="button"
                className={`${styles.nav} ${styles.close}`}
                aria-label={dict.closeLabel}
                onClick={close}
              >
                <CloseIcon />
              </button>
              <AnimatePresence>
                {showPhotoChrome ? (
                  <m.button
                    key="previous"
                    type="button"
                    className={`${styles.nav} ${styles.prev}`}
                    aria-label={dict.previousImageLabel}
                    aria-disabled={!canNavigatePrev}
                    onClick={() => {
                      if (canNavigatePrev) prev();
                    }}
                    initial={{ opacity: 0, x: -6, y: "-50%" }}
                    animate={{ opacity: 1, x: 0, y: "-50%" }}
                    exit={{ opacity: 0, x: -6, y: "-50%" }}
                    transition={CHROME_TRANSITION}
                  >
                    <Icon name="chevronLeft" size={17} />
                  </m.button>
                ) : null}
                {showPhotoChrome ? (
                  <m.button
                    key="next"
                    type="button"
                    className={`${styles.nav} ${styles.next}`}
                    aria-label={dict.nextImageLabel}
                    aria-disabled={!canNavigateNext}
                    onClick={() => {
                      if (canNavigateNext) next();
                    }}
                    initial={{ opacity: 0, x: 6, y: "-50%" }}
                    animate={{ opacity: 1, x: 0, y: "-50%" }}
                    exit={{ opacity: 0, x: 6, y: "-50%" }}
                    transition={CHROME_TRANSITION}
                  >
                    <Icon name="chevronRight" size={17} />
                  </m.button>
                ) : null}
              </AnimatePresence>
            </div>
            <aside
              id="photo-modal-scroll-container"
              {...sheet.panelProps}
              className={`${styles.panel} ${sheet.expanded ? styles.expanded : ""}`}
              data-custom-scroll-container
            >
              <button
                type="button"
                className={styles.handleButton}
                aria-label={
                  sheet.expanded ? dict.collapsePhotoInfoLabel : dict.expandPhotoInfoLabel
                }
                aria-expanded={sheet.expanded}
                onClick={sheet.toggleExpanded}
              >
                <span className={styles.handle} />
              </button>
              {imgLoaded ? (
                <ExifPanel photo={photo} tagLabels={tagLabels} />
              ) : (
                <ExifPanelSkeleton photo={photo} tagCount={tagLabels.length} />
              )}
            </aside>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export { PhotoModal };
