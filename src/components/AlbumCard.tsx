import Image from "next/image";
import Link from "next/link";

import { PHOTO_GRID_IMAGE_SIZES } from "@/constants/breakpoints";
import { countLabel } from "@/lib/format/count-label";

import styles from "./AlbumCard.module.css";

type Props = {
  href: string;
  coverUrl: string | null;
  coverAlt: string;
  count: number;
  title: string;
  subtitle: string;
  priority?: boolean;
};

/**
 * 앨범 카드 — 정사각 커버 + 장수 배지 + 제목·부제.
 *
 * @param props.priority LCP 보호 — 첫 화면에 들어오는 카드만 eager 로드.
 */
const AlbumCard = ({
  href,
  coverUrl,
  coverAlt,
  count,
  title,
  subtitle,
  priority = false,
}: Props) => (
  <Link href={href} prefetch={false} className={styles.card} data-cursor-large="frame">
    <div className={styles.cover} data-protected-image>
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={coverAlt}
          fill
          sizes={PHOTO_GRID_IMAGE_SIZES}
          className={styles.img}
          draggable={false}
          priority={priority}
        />
      ) : null}
      <span className={styles.count}>{count}</span>
    </div>
    <div className={styles.info}>
      <div className={styles.title}>{title}</div>
      <div className={styles.meta}>
        {subtitle} · {countLabel(count, "photo")}
      </div>
    </div>
  </Link>
);

export { AlbumCard };
