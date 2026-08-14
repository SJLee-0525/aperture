import type { ArticleTocItem } from "@/features/dev-blog/_lib/markdown-toc";

import styles from "./ArticleTocList.module.css";

type Props = {
  items: ArticleTocItem[];
  activeId: string | null;
  label: string;
  onSelect: (id: string) => void;
};

/**
 * 목차 본문 — 데스크톱 확장 패널과 모바일 드로어가 같은 목록을 쓴다.
 *
 * 현재 항목은 `aria-current="location"` 과 함께 왼쪽 막대·굵기로도 표시한다. 색만으로 구분하면
 * 대비가 낮은 화면이나 색각 이상에서 어디를 읽고 있는지 알 수 없다.
 *
 * 제목이 길면 두 줄까지만 보이지만 잘린 뒷부분도 이름에는 남긴다 — 화면 낭독기는 말줄임된
 * 글자가 아니라 전체 제목을 읽어야 한다.
 *
 * 항목이 많아 부모 높이를 넘으면 이 목록이 스크롤한다. 스크롤 막대는 저장소 공용
 * `CustomScrollbar` 가 그린다 — 표식만 붙이면 지면에 이미 떠 있는 그 컴포넌트가 집어 간다.
 *
 * @param {Props} props
 * @param {ArticleTocItem[]} props.items h2 와 그 아래 h3 로 묶은 목차.
 * @param {string | null} props.activeId 현재 읽는 heading id.
 * @param {string} props.label 목차 영역의 이름.
 * @param {(id: string) => void} props.onSelect 항목을 고를 때 호출한다.
 * @returns {JSX.Element}
 */
const ArticleTocList = ({ items, activeId, label, onSelect }: Props) => (
  <nav
    className={styles.nav}
    aria-label={label}
    data-accent-scrollbar
    data-custom-scroll-container
    data-custom-scroll-scope="local"
  >
    <ol className={styles.list}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={styles.entry}
            aria-current={item.id === activeId ? "location" : undefined}
            title={item.text}
            onClick={() => onSelect(item.id)}
          >
            {item.text}
          </button>

          {item.children.length > 0 ? (
            <ol className={styles.children}>
              {item.children.map((child) => (
                <li key={child.id}>
                  <button
                    type="button"
                    className={`${styles.entry} ${styles.child}`}
                    aria-current={child.id === activeId ? "location" : undefined}
                    title={child.text}
                    onClick={() => onSelect(child.id)}
                  >
                    {child.text}
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
        </li>
      ))}
    </ol>
  </nav>
);

export { ArticleTocList };
