import Image from "next/image";
import Link from "next/link";

import styles from "./AlbumCard.module.css";

type Props = {
  href: string;
  coverUrl: string | null;
  coverAlt: string;
  count: number;
  title: string;
  subtitle: string;
};

/**
 * 앨범 카드 — 정사각 커버 + 장수 배지 + 제목·부제.
 *
 * @param {Props} props
 * @param {string} props.href
 * @param {string | null} props.coverUrl
 * @param {string} props.coverAlt
 * @param {number} props.count
 * @param {string} props.title
 * @param {string} props.subtitle
 * @returns {JSX.Element}
 */
const AlbumCard = ({ href, coverUrl, coverAlt, count, title, subtitle }: Props) => (
  <Link href={href} prefetch={false} className={styles.card} data-cursor-large="frame">
    <div className={styles.cover} data-protected-image>
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={coverAlt}
          fill
          sizes="(max-width: 760px) 50vw, (max-width: 1100px) 33vw, 25vw"
          className={styles.img}
          draggable={false}
        />
      ) : null}
      <span className={styles.count}>{count}</span>
    </div>
    <div className={styles.info}>
      <div className={styles.title}>{title}</div>
      <div className={styles.meta}>
        {subtitle} · {count} photos
      </div>
    </div>
  </Link>
);

export { AlbumCard };
