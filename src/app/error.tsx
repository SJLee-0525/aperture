"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ROUTES } from "@/constants/routes";
import { useLang } from "@/features/lang/_hooks/use-lang";

import styles from "./status.module.css";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/*
 * 라우트 에러 바운더리 — 렌더 중 오류를 잡는다(루트 레이아웃은 유지).
 * 루트 레이아웃 하위(LangProvider 안)라 useLang으로 ko/en 대응. editorial 톤은 status.module.css 공유.
 * 외부 로깅 없음(서버리스·$0) — 콘솔에만 기록.
 */
export default function Error({ error, reset }: Props) {
  const { dict } = useLang();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <div className={styles.label}>{dict.errorLabel}</div>
        <h1 className={styles.title}>{dict.errorTitle}</h1>
        <p className={styles.body}>
          {dict.errorBody}
          <br />
          {dict.errorBody2}
        </p>
        <div className={styles.actions}>
          <button type="button" onClick={reset} className={styles.retry}>
            {dict.errorRetry}
          </button>
          <Link href={ROUTES.LANDING} className={styles.home}>
            {dict.backHome}
          </Link>
        </div>
        {error.digest ? (
          <p className={styles.digest}>
            {dict.errorDigest}: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
