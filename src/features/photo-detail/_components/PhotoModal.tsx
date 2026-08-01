"use client";

import { AnimatePresence, m } from "motion/react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { ExifStrip } from "@/components/ExifStrip";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { ExifPanel } from "@/features/photo-detail/_components/ExifPanel";
import { ExifPanelSkeleton } from "@/features/photo-detail/_components/ExifPanelSkeleton";
import { usePhotoModal } from "@/features/photo-detail/_hooks/use-photo-modal";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useMounted } from "@/hooks/use-mounted";
import { usePullDownDismiss } from "@/hooks/use-pull-down-dismiss";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { pickText } from "@/lib/i18n/pick-text";
import type { Photo } from "@/types/photo";
import type { Tag } from "@/types/tag";

import styles from "./PhotoModal.module.css";

type Props = {
  photos: Photo[];
  tags: Tag[];
  photoIds?: string[];
  onClose?: () => void;
  animateOnOpen?: boolean;
  revealed?: boolean;
  onImageReady?: (id: string) => void;
};

const EASE = [0.22, 1, 0.36, 1] as const;
const MOBILE_QUERY = "(max-width: 900px)";
const COLLAPSE_TOUCH_THRESHOLD = 56;
const CLOSE_WHEEL_THRESHOLD = 80;
const CHROME_TRANSITION = { duration: 0.2, ease: EASE } as const;

const subscribeMobile = (onChange: () => void) => {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const readMobile = () => window.matchMedia(MOBILE_QUERY).matches;
const readServerMobile = () => false;

const closeIcon = (
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
);
const chevLeft = (
  <svg
    viewBox="0 0 24 24"
    width="17"
    height="17"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    aria-hidden="true"
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
const chevRight = (
  <svg
    viewBox="0 0 24 24"
    width="17"
    height="17"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    aria-hidden="true"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

/**
 * 사진 상세 — 데스크톱 라이트박스 / 모바일 바텀시트(탭으로 peek↔확장).
 * document.body로 포털 렌더 → sticky 헤더 등 어떤 조상 스태킹 컨텍스트에도 안 갇히고 항상 최상단.
 * AnimatePresence로 열림/닫힘 페이드+스케일(exit 포함). URL(?photo=)이 열림 상태의 단일 출처.
 */
const PhotoModal = ({
  photos,
  tags,
  photoIds,
  onClose,
  animateOnOpen = true,
  revealed = true,
  onImageReady,
}: Props) => {
  const { dict, lang } = useLang();
  const [expanded, setExpanded] = useState(false);
  const [photoChromeVisible, setPhotoChromeVisible] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);
  const mobile = useSyncExternalStore(subscribeMobile, readMobile, readServerMobile);
  const navigationLocked = mobile && expanded;
  const showPhotoChrome = !navigationLocked && photoChromeVisible;
  const onNavigateStart = useCallback(() => setImgLoaded(false), []);
  const { photo, open, close, next, prev } = usePhotoModal(
    photos,
    !navigationLocked && imgLoaded,
    onNavigateStart,
    photoIds,
    onClose,
  );
  const [seenId, setSeenId] = useState<string | undefined>(photo?.id);
  const touchStartY = useRef<number | null>(null);
  const collapsePullStartY = useRef<number | null>(null);
  const wheelTravel = useRef(0);
  const dismissSurfaceRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  // 사진이 바뀌면(prev/next·열기) 로더/스켈레톤을 다시 표시 — effect 없이 render-time reseed.
  if (photo && photo.id !== seenId) {
    setSeenId(photo.id);
    setImgLoaded(false);
    setExpanded(false);
    setPhotoChromeVisible(true);
  }
  const trapRef = useFocusTrap(open && revealed);
  const mounted = useMounted();
  useScrollLock(open);
  const {
    onTouchStart: onDismissTouchStart,
    onTouchMove: onDismissTouchMove,
    onTouchEnd: onDismissTouchEnd,
    onTouchCancel: onDismissTouchCancel,
  } = usePullDownDismiss({
    enabled: mobile && open && revealed && !expanded,
    onDismiss: close,
    surfaceRef: dismissSurfaceRef,
    canStart: (target) => {
      const element = target instanceof Element ? target : null;
      if (element?.closest("button")) return false;
      const panel = element?.closest("aside");
      return !panel || panel.scrollTop <= 1;
    },
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

  const alt = photo ? pickText(photo.title, lang) : "";
  // 렌더마다(크롬 토글·스크롤 상태 변화) 반복되는 id 조회는 Map으로 — O(사진×이웃), O(태그×사진태그) 제거.
  const photoById = useMemo(() => new Map(photos.map((item) => [item.id, item])), [photos]);
  const tagById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  const navigationIds = photoIds ?? photos.map((item) => item.id);
  const photoIndex = photo ? navigationIds.indexOf(photo.id) : -1;
  const adjacentPhotos =
    photoIndex >= 0 && navigationIds.length > 1
      ? [
          ...new Set([
            navigationIds[(photoIndex - 1 + navigationIds.length) % navigationIds.length],
            navigationIds[(photoIndex + 1) % navigationIds.length],
          ]),
        ]
          .map((id) => photoById.get(id))
          .filter((item): item is Photo => item != null)
      : [];
  const tagLabels = photo
    ? photo.tags.map((id) => {
        const found = tagById.get(id);
        return found ? pickText(found, lang) : id;
      })
    : [];

  const collapsePanel = (panel: HTMLElement) => {
    touchStartY.current = null;
    collapsePullStartY.current = null;
    wheelTravel.current = 0;
    panel.scrollTo({ top: 0 });
    setExpanded(false);
    setPhotoChromeVisible(true);
  };

  const expandPanel = (panel: HTMLElement) => {
    wheelTravel.current = 0;
    collapsePullStartY.current = null;
    panel.scrollTo({ top: 0 });
    setExpanded(true);
  };

  const onPanelScroll = (event: React.UIEvent<HTMLElement>) => {
    if (!expanded && event.currentTarget.scrollTop > 8) expandPanel(event.currentTarget);
  };

  const onPanelTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    const nextY = event.touches[0]?.clientY;
    if (nextY == null) return;
    const panel = event.currentTarget;

    if (!expanded && touchStartY.current != null) {
      const openTravel = nextY - touchStartY.current;
      if (openTravel < -8) {
        touchStartY.current = nextY;
        expandPanel(panel);
      }
      return;
    }

    // 펼친 상태에서는 최상단에서 아래로 당겨도 모달이 아닌 EXIF 패널만 축소한다.
    if (panel.scrollTop > 1) {
      collapsePullStartY.current = null;
      return;
    }
    if (collapsePullStartY.current == null || nextY < collapsePullStartY.current) {
      collapsePullStartY.current = nextY;
      return;
    }
    if (nextY - collapsePullStartY.current > COLLAPSE_TOUCH_THRESHOLD) collapsePanel(panel);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && photo ? (
        <m.div
          key="photo-modal"
          ref={trapRef}
          tabIndex={-1}
          className={styles.modal}
          role={revealed ? "dialog" : undefined}
          aria-modal={revealed ? "true" : undefined}
          aria-label={revealed ? alt : undefined}
          aria-hidden={revealed ? undefined : true}
          inert={!revealed}
          initial={animateOnOpen ? { opacity: 0 } : false}
          animate={{ opacity: revealed ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onTouchStart={onDismissTouchStart}
          onTouchMove={onDismissTouchMove}
          onTouchEnd={onDismissTouchEnd}
          onTouchCancel={onDismissTouchCancel}
        >
          <button
            type="button"
            className={styles.scrim}
            aria-label={dict.closeLabel}
            onClick={close}
          />
          <m.div
            ref={dismissSurfaceRef}
            className={styles.inner}
            initial={animateOnOpen ? { opacity: 0, scale: 0.985 } : false}
            animate={
              animateOnOpen
                ? { opacity: revealed ? 1 : 0, scale: revealed ? 1 : 0.985 }
                : { opacity: revealed ? 1 : 0, y: revealed ? 0 : 14 }
            }
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
                if ((event.target as HTMLElement).closest("button")) return;
                if (mobile && expanded && panelRef.current) {
                  collapsePanel(panelRef.current);
                } else {
                  setPhotoChromeVisible((visible) => !visible);
                }
              }}
            >
              <Image
                key={photo.id}
                src={photo.image.url}
                alt={alt}
                fill
                sizes="100vw"
                className={styles.img}
                draggable={false}
                onContextMenu={(event) => event.preventDefault()}
                onDragStart={(event) => event.preventDefault()}
                priority
                onLoad={() => {
                  setImgLoaded(true);
                  onImageReady?.(photo.id);
                }}
                onError={() => {
                  setImgLoaded(true);
                  onImageReady?.(photo.id);
                }}
              />
              <div className={styles.preloads} aria-hidden="true">
                {adjacentPhotos.map((adjacent) => (
                  <Image
                    key={adjacent.id}
                    src={adjacent.image.url}
                    alt=""
                    width={adjacent.image.w}
                    height={adjacent.image.h}
                    sizes="100vw"
                    draggable={false}
                  />
                ))}
              </div>
              {imgLoaded ? null : (
                <div className={styles.imgLoader} aria-hidden="true">
                  <span className={styles.spinner} />
                </div>
              )}
              <AnimatePresence>
                {imgLoaded && showPhotoChrome ? (
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
                {closeIcon}
              </button>
              <AnimatePresence>
                {showPhotoChrome ? (
                  <m.button
                    key="previous"
                    type="button"
                    className={`${styles.nav} ${styles.prev}`}
                    aria-label={dict.previousImageLabel}
                    onClick={prev}
                    disabled={!imgLoaded}
                    initial={{ opacity: 0, x: -6, y: "-50%" }}
                    animate={{ opacity: 1, x: 0, y: "-50%" }}
                    exit={{ opacity: 0, x: -6, y: "-50%" }}
                    transition={CHROME_TRANSITION}
                  >
                    {chevLeft}
                  </m.button>
                ) : null}
                {showPhotoChrome ? (
                  <m.button
                    key="next"
                    type="button"
                    className={`${styles.nav} ${styles.next}`}
                    aria-label={dict.nextImageLabel}
                    onClick={next}
                    disabled={!imgLoaded}
                    initial={{ opacity: 0, x: 6, y: "-50%" }}
                    animate={{ opacity: 1, x: 0, y: "-50%" }}
                    exit={{ opacity: 0, x: 6, y: "-50%" }}
                    transition={CHROME_TRANSITION}
                  >
                    {chevRight}
                  </m.button>
                ) : null}
              </AnimatePresence>
            </div>
            <aside
              id="photo-modal-scroll-container"
              ref={panelRef}
              className={`${styles.panel} ${expanded ? styles.expanded : ""}`}
              data-custom-scroll-container
              onScroll={onPanelScroll}
              onTouchStart={(event) => {
                const startY = event.touches[0]?.clientY ?? null;
                touchStartY.current = startY;
                collapsePullStartY.current =
                  expanded && event.currentTarget.scrollTop <= 1 ? startY : null;
              }}
              onTouchMove={onPanelTouchMove}
              onTouchEnd={() => {
                touchStartY.current = null;
                collapsePullStartY.current = null;
              }}
              onWheel={(event) => {
                const panel = event.currentTarget;

                if (expanded) {
                  // 최상단에 닿기 전의 역스크롤은 축소 임계치에 누적하지 않는다.
                  if (panel.scrollTop > 1 || event.deltaY >= 0) {
                    wheelTravel.current = 0;
                    return;
                  }
                  wheelTravel.current += event.deltaY;
                  if (wheelTravel.current < -CLOSE_WHEEL_THRESHOLD) collapsePanel(panel);
                  return;
                }

                const sameDirection =
                  wheelTravel.current === 0 ||
                  Math.sign(wheelTravel.current) === Math.sign(event.deltaY);
                wheelTravel.current = sameDirection
                  ? wheelTravel.current + event.deltaY
                  : event.deltaY;

                if (wheelTravel.current > 8 && !expanded) {
                  expandPanel(panel);
                }
              }}
            >
              <button
                type="button"
                className={styles.handleButton}
                aria-label={expanded ? dict.collapsePhotoInfoLabel : dict.expandPhotoInfoLabel}
                aria-expanded={expanded}
                onClick={(event) => {
                  const panel = event.currentTarget.closest("aside");
                  if (expanded && panel) {
                    collapsePanel(panel);
                  } else if (panel) {
                    expandPanel(panel);
                  }
                }}
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
