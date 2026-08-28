"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/CloseIcon";
import { ArticleTocList } from "@/features/dev-blog/_components/ArticleTocList";

import { useDialog } from "@/hooks/use-dialog";

import { DICTIONARY } from "@/constants/dictionary";

import type { ArticleTocItem } from "@/features/dev-blog/_lib/markdown-toc";
import type { Lang } from "@/types/lang";

import styles from "./ArticleTocDrawer.module.css";

type Props = {
  items: ArticleTocItem[];
  activeId: string | null;
  open: boolean;
  panelId: string;
  lang: Lang;
  onClose: () => void;
  onSelect: (id: string) => void;
};

/**
 * 손가락으로 쓰는 환경의 목차 — 인디케이터가 있던 오른쪽 가운데에서 자라는 작은 패널.
 *
 * 화면을 가득 채우지 않는다. 목차는 읽던 자리를 잃지 않고 옮겨 다니려고 여는 것이라 본문이
 * 뒤에 보이는 편이 낫고, 전면 시트는 페이지를 떠나는 느낌을 준다.
 *
 * `document.body` 로 포털해 본문의 stacking context 밖에 둔다. 열린 동안에는 배경 스크롤을 잠그고
 * 나머지 body 자식(본문과 챗봇 런처 포함)을 `inert` 로 만들어, 패널 뒤의 요소가 눌리거나
 * 포커스를 가져가지 않게 한다. Escape 는 최상위 오버레이일 때만 받아 다른 모달과 겹칠 때
 * 둘이 함께 닫히는 일을 막는다.
 *
 * 열면 현재 읽던 항목이 보이는 자리로 목록을 스크롤하고 그 항목에 포커스를 준다 — 긴 목차에서
 * 맨 위부터 다시 찾지 않게 하려는 것이다. 닫을 때는 열었던 눈금으로 포커스를 돌려준다.
 *
 * @param props.items 목차 항목.
 * @param props.activeId 현재 heading id.
 * @param props.open 열림 여부.
 * @param props.panelId 여는 버튼의 `aria-controls` 대상 id.
 * @param props.lang 라벨 언어.
 * @param props.onClose 닫기 요청(backdrop·닫기 버튼·Escape).
 * @param props.onSelect 항목 선택 — 상위가 드로어를 닫고 이동시킨다.
 * @returns 닫혀 있거나 마운트 전이면 null.
 */
const ArticleTocDrawer = ({ items, activeId, open, panelId, lang, onClose, onSelect }: Props) => {
  const dict = DICTIONARY[lang];
  const { panelRef, overlayRef, mounted } = useDialog(open, { isolate: true, escape: onClose });
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    return () => restoreFocusRef.current?.focus?.();
  }, [open]);

  // 현재 항목을 보이는 자리로 올리고 포커스를 옮긴다.
  useEffect(() => {
    if (!open) return;
    const current = panelRef.current?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!current) return;
    current.scrollIntoView({ block: "nearest" });
    current.focus({ preventScroll: true });
  }, [open, activeId, panelRef]);


  if (!mounted || !open) return null;

  return createPortal(
    <div ref={overlayRef} className={styles.overlay} data-article-toc-drawer>
      <button
        type="button"
        className={styles.backdrop}
        aria-label={dict.closeLabel}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        id={panelId}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={dict.tocLabel}
        tabIndex={-1}
      >
        <div className={styles.head}>
          <span className={styles.heading}>{dict.tocLabel}</span>
          <button
            type="button"
            className={styles.close}
            aria-label={dict.closeLabel}
            onClick={onClose}
          >
            <CloseIcon size={16} />
          </button>
        </div>
        <ArticleTocList
          items={items}
          activeId={activeId}
          label={dict.tocLabel}
          onSelect={onSelect}
        />
      </div>
    </div>,
    document.body,
  );
};

export { ArticleTocDrawer };
