import styles from "./ImageFallback.module.css";

type Props = {
  /** 상자에 덧붙일 클래스. 커버 자리에 맞추는 크기·비율은 호출부가 정한다. */
  className?: string | undefined;
};

/**
 * 이미지가 아직 없거나 불러오지 못한 자리를 채우는 워드마크.
 *
 * 정적 이미지 두 장을 테마별로 겹쳐 두면 숨긴 쪽도 브라우저가 내려받는다. 이 저장소의
 * 테마는 `html[data-theme]` 수동 토글이라 `<source media="(prefers-color-scheme)">` 로는
 * 한 장만 받게 만들 수도 없다. 토큰을 쓰는 마크업이면 요청이 0회이고 테마도 정확하다.
 *
 * 장식이므로 이름을 갖지 않는다. 이 자리를 설명하는 이름은 감싸는 링크나 버튼이 갖는다.
 */
const ImageFallback = ({ className }: Props) => (
  <div className={className ? `${styles.fallback} ${className}` : styles.fallback} aria-hidden="true">
    <span className={styles.mark}>
      Sungjoon Lee<span className={styles.dot}>.</span>
    </span>
  </div>
);

export { ImageFallback };
