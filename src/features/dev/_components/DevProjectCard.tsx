import Image from "next/image";

import { pickText } from "@/lib/i18n/pick-text";
import type { DevProject } from "@/types/dev";
import type { Lang } from "@/types/lang";

import styles from "./DevProjectsView.module.css";

type Props = {
  project: DevProject;
  lang: Lang;
  onSelect: (id: string) => void;
};

/** 목록에서 사용하는 프로젝트 요약 카드. */
const DevProjectCard = ({ project, lang, onSelect }: Props) => {
  return (
    <button type="button" className={styles.card} onClick={() => onSelect(project.id)}>
      <div className={styles.cover}>
        {project.cover?.url ? (
          <Image
            src={project.cover.url}
            alt={pickText(project.title, lang)}
            fill
            sizes="(max-width: 720px) 100vw, 560px"
            className={styles.coverImg}
          />
        ) : (
          <span className={styles.coverEmpty}>NO IMAGE</span>
        )}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.year}>{project.year}</div>
        <div className={styles.pt}>{pickText(project.title, lang)}</div>
        <div className={styles.pc}>{pickText(project.category, lang)}</div>
        <p className={styles.pd}>{pickText(project.summary, lang)}</p>
      </div>
    </button>
  );
};

export { DevProjectCard };
