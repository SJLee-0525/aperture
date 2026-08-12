import { Skeleton } from "@/components/Skeleton";
import { ARTICLE_HERO_MIN_HEIGHT } from "@/features/dev-blog/_lib/article-hero-height";

import styles from "./loading.module.css";

/** 본문 자리 — 문단 길이가 들쭉날쭉해 보이도록 폭을 섞는다. */
const LINE_WIDTHS = ["100%", "96%", "88%", "100%", "72%"];

/**
 * 블로그 상세의 RSC 대기 화면 — 히어로 높이를 실제 지면과 같은 상수에서 가져온다.
 *
 * @returns {JSX.Element}
 */
export default function DevArticleLoading() {
  return (
    <div aria-busy="true">
      <Skeleton height={ARTICLE_HERO_MIN_HEIGHT} />
      <div className={styles.column}>
        <Skeleton width="60%" height={28} />
        {LINE_WIDTHS.map((width, index) => (
          <Skeleton key={index} width={width} height={14} />
        ))}
      </div>
    </div>
  );
}
