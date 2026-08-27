import styles from "./ImageFallback.module.css";

type Props = {
  /** 상자에 덧붙일 클래스. 커버 자리에 맞추는 크기·비율은 호출부가 정한다. */
  className?: string | undefined;
  /**
   * 흐름 안에 놓을지.
   *
   * 기본은 `next/image` 의 `fill` 자리를 그대로 덮는 절대 배치다. 본문처럼 이미지가 문서
   * 흐름에 놓이는 자리만 켠다. 이 판정을 호출부 CSS 모듈이 `position` 을 덮어써서 하면
   * 두 모듈의 같은 프로퍼티가 명시도 동률로 다투고, 승자를 스타일시트 주입 순서가 정한다.
   */
  flow?: boolean;
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
const ImageFallback = ({ className, flow = false }: Props) => (
  <div
    className={[styles.fallback, flow ? styles.flow : null, className].filter(Boolean).join(" ")}
    aria-hidden="true"
  >
    <span className={styles.mark}>
      Sungjoon Lee<span className={styles.dot}>.</span>
    </span>
  </div>
);

export { ImageFallback };
