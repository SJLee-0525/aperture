import Image from "next/image";
import { memo } from "react";

import { ImageFallback } from "@/components/ImageFallback";

import { pickText } from "@/lib/i18n/pick-text";

import { imagePreviewUrl } from "@/types/image";

import type { DevProjectCardData } from "@/types/dev";
import type { Lang } from "@/types/lang";

import styles from "./DevProjectsView.module.css";

type Props = {
  project: DevProjectCardData;
  lang: Lang;
  onSelect: (id: string) => void;
  onPreload: () => void;
  /** LCP 보호 — 첫 화면에 들어오는 카드만 eager 로드. */
  priority?: boolean;
};

/** 목록에서 사용하는 프로젝트 요약 카드. */
const DevProjectCard = memo(function DevProjectCard({
  project,
  lang,
  onSelect,
  onPreload,
  priority = false,
}: Props) {
  const coverUrl = imagePreviewUrl(project.cover);
  const hasCover = Boolean(coverUrl);

  return (
    <button
      type="button"
      className={styles.card}
      data-cursor-large="frame"
      onClick={() => onSelect(project.id)}
      onFocus={onPreload}
      onMouseEnter={onPreload}
    >
      <div className={styles.cover} data-protected-image>
        {hasCover ? (
          <Image
            src={coverUrl}
            alt={pickText(project.title, lang)}
            fill
            sizes="(max-width: 720px) 100vw, 560px"
            className={styles.coverImg}
            draggable={false}
            priority={priority}
          />
        ) : (
          <ImageFallback />
        )}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.year}>{project.year}</div>
        <div className={styles.pt}>{pickText(project.title, lang)}</div>
        <div className={styles.pc}>{pickText(project.category, lang)}</div>
      </div>
    </button>
  );
});

export { DevProjectCard };
