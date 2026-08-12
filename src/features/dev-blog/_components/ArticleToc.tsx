"use client";

import { useEffect, useId, useRef, useState } from "react";

import { DICTIONARY } from "@/constants/dictionary";
import { ArticleTocDrawer } from "@/features/dev-blog/_components/ArticleTocDrawer";
import { ArticleTocList } from "@/features/dev-blog/_components/ArticleTocList";
import { ArticleTocRail } from "@/features/dev-blog/_components/ArticleTocRail";
import { useActiveHeading } from "@/features/dev-blog/_hooks/use-active-heading";
import { useHoverGrace } from "@/features/dev-blog/_hooks/use-hover-grace";
import { useTocZone } from "@/features/dev-blog/_hooks/use-toc-zone";
import { navigateToHeading, restoreScroll } from "@/features/dev-blog/_lib/heading-navigation";

import type { ArticleTocItem } from "@/features/dev-blog/_lib/markdown-toc";
import type { Lang } from "@/types/lang";

import styles from "./ArticleToc.module.css";

/** 목차가 도움이 되려면 옮겨 다닐 곳이 최소 둘은 있어야 한다. */
const MIN_HEADINGS = 2;

type Props = {
  items: ArticleTocItem[];
  zoneSelector: string;
  lang: Lang;
};

/**
 * 본문 옆에 붙는 목차 — 평소에는 오른쪽 가장자리의 눈금이고 필요할 때만 펼친다.
 *
 * 항상 펼친 열로 두면 본문 폭을 빼앗고 상단 고정 bar 로 두면 짧은 화면에서 본문을 가린다.
 * 포인터가 있는 환경에서는 눈금에 올리면 왼쪽으로 펼치고, 손가락으로 쓰는 환경에서는 hover 를
 * 흉내 내지 않고 눌렀을 때 드로어를 연다. 어느 쪽인지는 화면 폭이 아니라 포인터 능력으로 가른다 —
 * 좁은 창의 데스크톱과 큰 태블릿을 폭으로 가르면 둘 다 틀린다.
 *
 * heading 이 둘 미만이면 렌더하지 않는다.
 *
 * @param {Props} props
 * @param {ArticleTocItem[]} props.items 본문에서 만든 목차. h2 와 그 아래 h3 다.
 * @param {string} props.zoneSelector 본문 래퍼 선택자 — 이 구간에 있는 동안에만 목차가 보인다.
 * @param {Lang} props.lang 라벨 언어.
 * @returns {JSX.Element | null} 항목이 둘 미만이거나 본문 구간 밖이면 null.
 */
const ArticleToc = ({ items, zoneSelector, lang }: Props) => {
  const dict = DICTIONARY[lang];
  const panelId = useId();
  const [finePointer, setFinePointer] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pendingHeadingRef = useRef<string | null>(null);
  const hover = useHoverGrace();

  const headingIds = items.flatMap((item) => [item.id, ...item.children.map((child) => child.id)]);
  const activeId = useActiveHeading(headingIds);
  const inZone = useTocZone(zoneSelector);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFinePointer(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // 패널이 닫힌 뒤에 이동한다. 열려 있는 동안 잠갔던 스크롤을 푸는 처리가 이동 직후에 돌면
  // 저장해 둔 위치로 되돌려 버려, 눌러도 제자리인 것처럼 보인다.
  useEffect(() => {
    if (drawerOpen) return;
    const pending = pendingHeadingRef.current;
    if (!pending) return;
    pendingHeadingRef.current = null;
    navigateToHeading(pending);
  }, [drawerOpen]);

  // 목차로 이동한 뒤 뒤로가기 — 저장해 둔 위치로 되돌린다.
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      restoreScroll(event);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (headingIds.length < MIN_HEADINGS) return null;

  const select = (id: string) => {
    hover.close();
    navigateToHeading(id);
  };

  return (
    <>
      <div
        className={styles.dock}
        data-visible={inZone || drawerOpen}
        data-expanded={finePointer && hover.open}
        onPointerEnter={finePointer ? hover.onEnter : undefined}
        onPointerLeave={finePointer ? hover.onLeave : undefined}
        onFocus={finePointer ? hover.onEnter : undefined}
        onBlur={(event) => {
          if (!finePointer) return;
          if (!event.currentTarget.contains(event.relatedTarget)) hover.onLeave();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") hover.close();
        }}
      >
        <ArticleTocRail
          items={items}
          activeId={activeId}
          label={dict.tocOpenLabel}
          expanded={finePointer ? hover.open : drawerOpen}
          panelId={panelId}
          onOpen={() => (finePointer ? hover.onEnter() : setDrawerOpen(true))}
        />

        {finePointer ? (
          <div className={styles.panel} id={panelId} hidden={!hover.open}>
            <ArticleTocList
              items={items}
              activeId={activeId}
              label={dict.tocLabel}
              onSelect={select}
            />
          </div>
        ) : null}
      </div>

      {finePointer ? null : (
        <ArticleTocDrawer
          items={items}
          activeId={activeId}
          open={drawerOpen}
          panelId={panelId}
          lang={lang}
          onClose={() => setDrawerOpen(false)}
          onSelect={(id) => {
            pendingHeadingRef.current = id;
            setDrawerOpen(false);
          }}
        />
      )}
    </>
  );
};

export { ArticleToc };
