import type { UIDict } from "@/constants/dictionary";

import styles from "./ArticlePagination.module.css";

type Props = {
  page: number;
  pageCount: number;
  dict: UIDict;
  onSelect: (page: number) => void;
};

/**
 * 목록 페이지 이동. 페이지가 하나뿐이면 아무것도 그리지 않는다.
 *
 * 링크가 아니라 버튼을 쓴다. 이동은 같은 화면 안에서 주소만 바꾸는 일이고, 이 지면의 주소
 * 갱신은 `pushCurrentUrl` 이 맡는다(같은 pathname 으로의 라우터 이동이 Next 16 에서 no-op).
 * 현재 페이지는 `aria-current="page"` 로 알리며 색 대비만으로 구분하지 않는다.
 *
 * @param {Props} props
 * @param {number} props.page 현재 페이지(1부터).
 * @param {number} props.pageCount 전체 페이지 수.
 * @param {UIDict} props.dict 현재 언어 사전 — 이동 버튼의 accessible name 에 쓴다.
 * @param {(page: number) => void} props.onSelect 페이지를 고를 때 호출한다. 현재 페이지는 호출하지 않는다.
 * @returns {JSX.Element | null} 페이지가 하나면 null.
 */
const ArticlePagination = ({ page, pageCount, dict, onSelect }: Props) => {
  if (pageCount <= 1) return null;

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <nav className={styles.pagination} aria-label={dict.paginationLabel}>
      <button
        type="button"
        className={styles.step}
        aria-label={dict.paginationPrev}
        disabled={page === 1}
        onClick={() => onSelect(page - 1)}
      >
        ←
      </button>
      {pages.map((number) => (
        <button
          key={number}
          type="button"
          className={styles.page}
          aria-label={dict.paginationPage.replace("{n}", String(number))}
          aria-current={number === page ? "page" : undefined}
          onClick={() => (number === page ? undefined : onSelect(number))}
        >
          {number}
        </button>
      ))}
      <button
        type="button"
        className={styles.step}
        aria-label={dict.paginationNext}
        disabled={page === pageCount}
        onClick={() => onSelect(page + 1)}
      >
        →
      </button>
    </nav>
  );
};

export { ArticlePagination };
