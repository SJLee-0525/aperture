import styles from "./BrandLoader.module.css";

/**
 * 브랜드 로더 비주얼 — serif 워드마크(Sungjoon Lee.) + indeterminate 액센트 바.
 * 사이트 워드마크(고유명사)라 언어 무관. 첫 로딩 인트로(IntroSplash)에서 사용.
 */
const BrandLoader = () => (
  <div className={styles.loader}>
    <span className={styles.brand}>
      Sungjoon Lee<span className={styles.dot}>.</span>
    </span>
    <span className={styles.bar} role="presentation">
      <span className={styles.barFill} />
    </span>
  </div>
);

export { BrandLoader };
