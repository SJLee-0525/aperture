"use client";

import { shouldUseMockContent } from "@/lib/content/content-source";

import styles from "./MockModeBadge.module.css";

/**
 * 관리자 mock 모드 안내 배너. 콘텐츠 소스가 mock 일 때만 관리자 크롬 상단에 붙어,
 * 지금 저장이 실제 DB 가 아니라 이 브라우저의 로컬 저장소로 간다는 사실을
 * 화면마다 반복하지 않고 한 곳에서 알린다. mock 저장은 공개 화면·RAG 후처리를 건너뛰고,
 * 업로드 이미지는 objectURL 이라 새로고침하면 끊어진다 — 관리자가 실데이터를 만졌다고
 * 착각한 채 작업을 쌓는 사고를 막는 것이 목적이다.
 *
 * 콘텐츠 소스는 빌드 시 인라인되는 env 로 정해지므로 서버 렌더와 hydration 결과가 같다.
 *
 * @returns mock 모드에서는 안내 배너, 실데이터 모드에서는 null.
 */
const MockModeBadge = () => {
  if (!shouldUseMockContent()) return null;

  return (
    <div className={styles.banner} role="status">
      <span className={styles.chip}>MOCK</span>
      <p className={styles.text}>
        mock 모드: 저장값은 이 브라우저에만 남고 공개 화면과 챗봇에는 반영되지 않습니다. 업로드한
        이미지는 새로고침하면 표시되지 않습니다.
      </p>
    </div>
  );
};

export { MockModeBadge };
