"use client";

import { AnimatePresence, m } from "motion/react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/CloseIcon";
import { ExifStrip } from "@/components/ExifStrip";
import { Icon } from "@/components/Icon";
import { ExifPanel } from "@/features/photo-detail/_components/ExifPanel";
import { ExifPanelSkeleton } from "@/features/photo-detail/_components/ExifPanelSkeleton";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { PHOTO_QUERY_KEY } from "@/features/photo-detail/_hooks/use-photo-detail-session";
import { usePhotoModal } from "@/features/photo-detail/_hooks/use-photo-modal";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useImageZoom } from "@/hooks/use-image-zoom";
import { useMounted } from "@/hooks/use-mounted";
import { useOverlayDrag } from "@/hooks/use-overlay-drag";
import { useOverlayLayer } from "@/hooks/use-overlay-layer";
import { useRegisterChatScreenTarget } from "@/hooks/use-register-chat-screen-target";
import { useScrollLock } from "@/hooks/use-scroll-lock";

import { readPhotoNeighbors } from "@/features/photo-detail/_lib/photo-neighbors";

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
  chatTarget?: boolean;
};

type ImageStatus = "loaded" | "failed";

type Slide = {
  key: string;
  item: Photo | null;
  current: boolean;
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

/**
 * 사진 상세 — 데스크톱 라이트박스 / 모바일 바텀시트(탭으로 peek↔확장).
 * document.body로 포털 렌더 → sticky 헤더 등 어떤 조상 스태킹 컨텍스트에도 안 갇히고 항상 최상단.
 * AnimatePresence로 열림/닫힘 페이드+스케일(exit 포함). URL(?photo=)이 열림 상태의 단일 출처.
 * 이전·현재·다음 세 장을 트랙에 올려 모바일에서 좌우로 끌어 넘길 수 있게 한다.
 *
 * @param {Props} props
 * @param {Photo[]} props.photos
 * @param {Tag[]} props.tags
 * @param {string[] | undefined} props.photoIds
 * @param {(() => void) | undefined} props.onClose
 * @param {boolean | undefined} props.animateOnOpen
 * @param {boolean | undefined} props.revealed
 * @param {((id: string) => void) | undefined} props.onImageReady
 * @param {boolean | undefined} props.chatTarget 열린 사진을 챗봇 화면 문맥으로 등록할지 여부.
 * @returns {ReactPortal | null}
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
  const [expanded, setExpanded] = useState(false);
  const [photoChromeVisible, setPhotoChromeVisible] = useState(true);
  // 이웃으로 미리 그려 둔 이미지가 현재로 승격돼도 onLoad는 다시 뛰지 않는다.
  // 사진별 결과를 누적해야 승격 직후 스피너가 다시 덮지 않는다.
  const [imageStatus, setImageStatus] = useState<ReadonlyMap<string, ImageStatus>>(() => new Map());
  // 재시도할 때마다 슬라이드 키를 바꿔 img 를 다시 마운트한다. 같은 src 는 그냥 두면 다시 받지 않는다.
  const [retryCounts, setRetryCounts] = useState<ReadonlyMap<string, number>>(() => new Map());

  const searchParams = useSearchParams();

  // usePhotoModal 이 반환하는 photo 로는 그 호출의 인자를 만들 수 없어 URL 에서 직접 읽는다.
  const activePhotoId = searchParams.get(PHOTO_QUERY_KEY);
  const activeStatus = activePhotoId != null ? imageStatus.get(activePhotoId) : undefined;

  // 실패도 결판이 난 상태다. 스피너를 걷고 오류를 보여 준다.
  const imgLoaded = activeStatus != null;
  const imgFailed = activeStatus === "failed";
  const mobile = useSyncExternalStore(subscribeMobile, readMobile, readServerMobile);
  const navigationLocked = mobile && expanded;
  const isTopLayer = useOverlayLayer(Boolean(photos.length));
  const showPhotoChrome = !navigationLocked && photoChromeVisible;
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
  const touchStartY = useRef<number | null>(null);
  const collapsePullStartY = useRef<number | null>(null);
  const wheelTravel = useRef(0);
  const dismissSurfaceRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);

  // 사진이 바뀌면(prev/next·열기) 패널과 크롬을 기본 상태로 — effect 없이 render-time reseed.
  if (photo && photo.id !== seenId) {
    setSeenId(photo.id);
    setExpanded(false);
    setPhotoChromeVisible(true);
  }
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
    neighbors.previous != null && imageStatus.get(neighbors.previous.id) === "loaded";
  const canPeekNext = neighbors.next != null && imageStatus.get(neighbors.next.id) === "loaded";
  const tagLabels = photo
    ? photo.tags.map((id) => {
        const found = tagById.get(id);
        return found ? pickText(found, lang) : id;
      })
    : [];
  const slideKey = (id: string, suffix = "") => `${id}${suffix}@${retryCounts.get(id) ?? 0}`;
  const slides: Slide[] = photo
    ? [
        {
          key: neighbors.previous ? slideKey(neighbors.previous.id) : "empty-previous",
          item: neighbors.previous,
          current: false,
        },
        { key: slideKey(photo.id), item: photo, current: true },
        {
          // 사진이 2장이면 이전과 다음이 같은 문서라 키가 겹친다.
          key:
            neighbors.next == null
              ? "empty-next"
              : slideKey(
                  neighbors.next.id,
                  neighbors.next.id === neighbors.previous?.id ? "#next" : "",
                ),
          item: neighbors.next,
          current: false,
        },
      ]
    : [];

  const markImage = useCallback((id: string, status: ImageStatus) => {
    setImageStatus((current) =>
      current.get(id) === status ? current : new Map(current).set(id, status),
    );
  }, []);

  const retryImage = useCallback((id: string) => {
    setImageStatus((current) => {
      const rest = new Map(current);
      rest.delete(id);
      return rest;
    });
    setRetryCounts((current) => new Map(current).set(id, (current.get(id) ?? 0) + 1));
  }, []);

  const {
    stageRef: zoomSurfaceRef,
    zoomed,
    reset: resetZoom,
    handleStageClick,
  } = useImageZoom({
    enabled: open && revealed && isTopLayer && !navigationLocked,
    // 재시도는 슬라이드 key 를 바꿔 표면 노드를 교체하므로 재시도 횟수까지
    // resetKey 에 포함해야 리스너가 새 노드로 옮겨 붙는다.
    resetKey: photo ? `${photo.id}@${retryCounts.get(photo.id) ?? 0}` : "",
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
    enabled: mobile && open && revealed && !expanded && !zoomed,
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
          data-photo-modal-root
          role={revealed ? "dialog" : undefined}
          aria-modal={revealed ? "true" : undefined}
          aria-label={revealed ? alt : undefined}
          aria-hidden={revealed ? undefined : true}
          inert={!revealed}
          initial={animateOnOpen ? { opacity: 0 } : false}
          // 온디맨드 경로는 별도 pending 프레임이 로딩 전환을 소유한다.
          // 그 아래 모달까지 투명하게 만들면 pending 제거 직후 페이지가 비친다.
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
            initial={animateOnOpen ? { opacity: 0, scale: 0.985 } : false}
            animate={
              animateOnOpen
                ? { opacity: revealed ? 1 : 0, scale: revealed ? 1 : 0.985 }
                : { opacity: 1, y: 0 }
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
                // 드래그 뒤 브라우저가 합성하는 click 은 크롬 토글로 보지 않는다.
                if (consumeDragged()) return;
                if ((event.target as HTMLElement).closest("button")) return;
                // 더블탭 확대와 겹치지 않도록 단일탭 동작은 판정 시간만큼 보류된다.
                handleStageClick(() => {
                  if (mobile && expanded && panelRef.current) {
                    collapsePanel(panelRef.current);
                  } else {
                    setPhotoChromeVisible((visible) => !visible);
                  }
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
                      {item && imageStatus.get(item.id) !== "failed" ? (
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
                          onLoad={() => markImage(item.id, "loaded")}
                          onError={() => markImage(item.id, "failed")}
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
                    onClick={() => retryImage(photo.id)}
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
                    onClick={prev}
                    disabled={!canNavigatePrev}
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
                    onClick={next}
                    disabled={!canNavigateNext}
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
