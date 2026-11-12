import styles from "./MapUnavailableNotice.module.css";

type Props = {
  message: string;
  /** 미니맵처럼 아래쪽에 캡션이 있는 작은 지면. 문구를 캡션 위 빈 자리에 둔다. */
  compact?: boolean;
};

/**
 * 지도를 그릴 수 없을 때 지도 자리에 띄우는 안내.
 *
 * 지도 컨테이너 안이 아니라 형제로 렌더해야 한다. maplibre 가 컨테이너에 클래스를 달아
 * position 이 다투게 되고, 위치 기준은 지도와 함께 position 을 가진 부모가 된다.
 */
const MapUnavailableNotice = ({ message, compact = false }: Props) => (
  <p className={styles.notice} data-variant={compact ? "compact" : undefined} role="status">
    {message}
  </p>
);

export { MapUnavailableNotice };
