"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useScrollLock } from "@/hooks/use-scroll-lock";

import styles from "./Modal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  closeLabel: string;
  crumb?: string;
  label?: string;
  maxWidth?: number; // 패널 최대 폭(px) — 연주 920 / 수상 600 등
  /** 모바일(≤640px)에서 패널을 화면 꽉 채움 — 콘텐츠 긴 상세 모달용(프로젝트·연주). */
  mobileFull?: boolean;
  children: React.ReactNode;
};

/**
 * 다이얼로그 모달 — 수직 중앙 정렬 + 스크롤 가능한 백드롭, 패널 y+scale 등장.
 * document.body 로 포털 — 헤더/섹션 래퍼의 stacking context 밖으로 빼내 네비 뒤에 가리지 않게 한다.
 * 스크림 클릭·ESC·스크롤 잠금. 음악·개발 상세 공용 순수 UI. 액센트는 상위 [data-section] 이 결정.
 */
const Modal = ({
  open,
  onClose,
  closeLabel,
  crumb,
  label,
  maxWidth,
  mobileFull,
  children,
}: Props) => {
  useScrollLock(open);
  const panelRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 모달은 클라 상호작용으로만 열린다(초기 SSR·hydration 시 open=false) → typeof 가드로 충분.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      id="modal-scroll-container"
      className={mobileFull ? `${styles.overlay} ${styles.overlayFull}` : styles.overlay}
      data-custom-scroll-container
    >
      <button type="button" className={styles.scrim} aria-label={closeLabel} onClick={onClose} />
      <div
        ref={panelRef}
        className={mobileFull ? `${styles.panel} ${styles.panelFull}` : styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={maxWidth ? { maxWidth: `${maxWidth}px` } : undefined}
      >
        <div className={styles.head}>
          <span className={styles.crumb}>{crumb}</span>
          <button type="button" className={styles.close} aria-label={closeLabel} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export { Modal };
