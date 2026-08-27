"use client";

import { useId } from "react";

import styles from "./AwardList.module.css";

type AwardRow = {
  id: string;
  year: number | string;
  name: string;
  /** 수상 기관·장소. 음악은 평면 문자열, 개발은 호출부가 `pickText` 로 만들어 넘긴다. */
  place?: string;
};

type Props = {
  awards: AwardRow[];
  /** 구획 제목. 섹션마다 사전 키가 다르다. */
  label: string;
  className?: string;
  onSelect: (id: string) => void;
};

/**
 * 수상 목록. 행을 누르면 `?award=` 딥링크 모달이 열린다.
 *
 * 음악과 개발이 같은 개념을 두 벌로 갖고 있었고 CSS 열세 블록이 값 단위로 같았다.
 * 도메인 차이는 `place` 의 타입과 상세의 프로젝트 링크 둘뿐이라 여기서는 투영된
 * 문자열만 받는다.
 */
const AwardList = ({ awards, label, className, onSelect }: Props) => {
  const headingId = useId();

  return (
    <section
      className={className ? `${styles.list} ${className}` : styles.list}
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className={styles.label}>
        {label}
      </h2>
      {awards.map((award) => (
        <button
          type="button"
          key={award.id}
          className={styles.row}
          onClick={() => onSelect(award.id)}
        >
          <span className={styles.year}>{award.year}</span>
          <span className={styles.name}>{award.name}</span>
          {award.place ? <span className={styles.place}>{award.place}</span> : null}
        </button>
      ))}
      <div className={styles.end} />
    </section>
  );
};

export { AwardList };
export type { AwardRow };
