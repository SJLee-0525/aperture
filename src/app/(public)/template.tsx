import styles from "./template.module.css";

/**
 * 공개 페이지 전환 애니메이션 — 라우트 이동 시 template이 재마운트되며 페이드가 재생된다.
 * (쿼리 변경 ?photo= 은 세그먼트가 안 바뀌어 재생 안 됨 → 모달 열 때 페이지가 깜빡이지 않음)
 * 투명도만 사용 — transform은 position:fixed 모달의 containing block을 깨므로 배제.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className={styles.enter}>{children}</div>;
}
