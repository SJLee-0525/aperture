"use client";

import { ROUTES } from "@/constants/routes";
import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";
import { useLang } from "@/features/lang/_hooks/use-lang";

import styles from "./status.module.css";

/*
 * 전역 404 — 미매칭 URL과 notFound() 호출을 모두 처리. 루트 레이아웃 하위라 useLang으로 ko/en 대응.
 * error.tsx와 동일한 editorial 톤(status.module.css 공유). 복구 버튼 없이 홈으로 유도.
 */
export default function NotFound() {
  const { dict } = useLang();

  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <div className={styles.label}>404</div>
        <h1 className={styles.title}>{dict.notFoundTitle}</h1>
        <p className={styles.body}>
          {dict.notFoundBody}
          <br />
          {dict.notFoundBody2}
        </p>
        <div className={styles.actions}>
          <LocalizedLink href={ROUTES.LANDING} className={styles.home}>
            {dict.backHome}
          </LocalizedLink>
        </div>
      </div>
    </main>
  );
}
