import styles from "./ExifStrip.module.css";

type Props = {
  aperture: string;
  shutter: string;
  iso: string;
  /** 사진 위에 얹을 때(글래스 pill) */
  glass?: boolean;
};

/** 노출 3값 압축 스트립 (F · S · ISO). glass는 사진 위 오버레이용. */
const ExifStrip = ({ aperture, shutter, iso, glass = false }: Props) => (
  <div className={`${styles.strip} ${glass ? styles.glass : ""}`}>
    <span className={styles.seg}>
      <span className={styles.lab}>F</span> {aperture}
    </span>
    <span className={styles.seg}>
      <span className={styles.lab}>S</span> {shutter}
    </span>
    <span className={styles.seg}>
      <span className={styles.lab}>ISO</span> {iso}
    </span>
  </div>
);

export { ExifStrip };
