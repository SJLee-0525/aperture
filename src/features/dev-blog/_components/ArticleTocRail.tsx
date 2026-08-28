import type { ArticleTocItem } from "@/features/dev-blog/_lib/markdown-toc";
import type { CSSProperties } from "react";

import styles from "./ArticleTocRail.module.css";

type Props = {
  items: ArticleTocItem[];
  activeId: string | null;
  label: string;
  expanded: boolean;
  panelId: string;
  onOpen: () => void;
};

/** 축소 상태의 눈금 하나 — depth 로 길이가 갈린다. */
type RailTick = { id: string; depth: 2 | 3 };

/**
 * 축소 상태의 목차 — 화면 오른쪽에 붙는 짧은 가로선 묶음.
 *
 * 선 하나가 heading 하나이고 h3 는 h2 보다 짧아 계층이 길이로 읽힌다. 현재 위치는 색과 함께
 * 길이·굵기로도 알린다. 전체가 하나의 버튼이라 어느 선을 눌러도 목차가 열린다 — 선 하나를
 * 각각 누르게 하면 포인터 표적이 3px 짜리가 된다.
 *
 * heading 이 많으면 눈금 사이 간격이 좁아져 전부 한 화면에 담긴다.
 *
 * @param props.items 목차 항목.
 * @param props.activeId 현재 heading id.
 * @param props.label 여는 버튼의 이름(`목차 열기`).
 * @param props.expanded 목차가 열려 있는지 — `aria-expanded` 로 알린다.
 * @param props.panelId 이 버튼이 여는 패널의 id.
 * @param props.onOpen 눌렀을 때 호출한다. 포인터 hover 로 여는 경로는 상위가 맡는다.
 */
const ArticleTocRail = ({ items, activeId, label, expanded, panelId, onOpen }: Props) => {
  const ticks: RailTick[] = items.flatMap((item) => [
    { id: item.id, depth: 2 as const },
    ...item.children.map((child) => ({ id: child.id, depth: 3 as const })),
  ]);

  return (
    <button
      type="button"
      className={styles.rail}
      // 눈금이 많을수록 CSS 가 간격을 좁힌다. 개수를 알아야 계산이 된다.
      style={{ "--tick-count": ticks.length } as CSSProperties}
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={panelId}
      // 커스텀 커서가 이 눈금에 달라붙지 않게 한다
      data-cursor-passive
      onClick={onOpen}
    >
      {ticks.map((tick) => (
        <span
          key={tick.id}
          className={styles.tick}
          data-depth={tick.depth}
          data-active={tick.id === activeId}
        />
      ))}
    </button>
  );
};

export { ArticleTocRail };
