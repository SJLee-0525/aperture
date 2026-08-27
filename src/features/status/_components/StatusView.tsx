"use client";

import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { ROUTES } from "@/constants/routes";

import styles from "./StatusView.module.css";

type Props = {
  label: string;
  title: string;
  body: string[];
  homeLabel: string;
  /** 홈 링크 왼쪽의 복구 버튼. 둘 다 주면 그린다. 404 에는 되돌릴 것이 없어 비운다. */
  retryLabel?: string | undefined;
  onRetry?: (() => void) | undefined;
  /** 본문 아래 한 줄. 오류 화면의 digest 처럼 식별자를 남길 때 쓴다. */
  note?: string | undefined;
};

/**
 * 404 와 오류 화면의 공용 지면.
 *
 * 두 화면은 같은 editorial 배치를 쓰고 언어도 같은 규칙을 따른다. 바운더리별 로직
 * (오류 전송, 재시도 콜백)은 각 파일이 갖고 이 컴포넌트는 배치만 맡는다.
 */
const StatusView = ({ label, title, body, homeLabel, retryLabel, onRetry, note }: Props) => (
  <main className={styles.main}>
    <div className={styles.inner}>
      <div className={styles.label}>{label}</div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.body}>
        {body.map((line, index) => (
          <span key={line}>
            {index > 0 ? <br /> : null}
            {line}
          </span>
        ))}
      </p>
      <div className={styles.actions}>
        {onRetry && retryLabel ? (
          <button type="button" onClick={onRetry} className={styles.retry}>
            {retryLabel}
          </button>
        ) : null}
        <LocalizedLink href={ROUTES.LANDING} className={styles.home}>
          {homeLabel}
        </LocalizedLink>
      </div>
      {note ? <p className={styles.digest}>{note}</p> : null}
    </div>
  </main>
);

export { StatusView };
