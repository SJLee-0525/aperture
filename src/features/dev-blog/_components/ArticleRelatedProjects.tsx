import Image from "next/image";
import Link from "next/link";

import { DICTIONARY } from "@/constants/dictionary";
import { devProjectRoute } from "@/constants/routes";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";

import { imageThumbnailUrl } from "@/types/image";

import type { DevProjectCardData } from "@/types/dev";
import type { Lang } from "@/types/lang";

import styles from "./ArticleRelatedProjects.module.css";

type Props = {
  projects: DevProjectCardData[];
  lang: Lang;
};

/**
 * 글이 지목한 프로젝트로 가는 카드 줄. 하나도 없으면 영역 자체를 만들지 않는다.
 *
 * 프로젝트 상세는 목록 화면의 모달이라 여기서 같은 모달을 다시 세우지 않고 `?project=` 딥링크로
 * 보낸다. 상세 화면 하나 때문에 프로젝트 모달과 그 데이터를 이 지면까지 끌고 오지 않으려는 것이다.
 *
 * 비공개·삭제된 프로젝트는 호출부가 공개 목록과 맞춰 걸러 준다 — 여기서는 받은 순서를 지킨다.
 *
 * @param {Props} props
 * @param {DevProjectCardData[]} props.projects 글이 지정한 순서의 공개 프로젝트.
 * @param {Lang} props.lang 링크 프리픽스와 제목·요약 언어.
 * @returns {JSX.Element | null} 프로젝트가 없으면 null.
 */
const ArticleRelatedProjects = ({ projects, lang }: Props) => {
  if (projects.length === 0) return null;
  const dict = DICTIONARY[lang];

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{dict.articleRelatedProjects}</h2>
      <ul className={styles.list}>
        {projects.map((project) => {
          const title = pickText(project.title, lang);
          const thumbnail = imageThumbnailUrl(project.cover);
          return (
            <li key={project.id}>
              <Link
                href={localizePath(lang, devProjectRoute(project.id))}
                prefetch={false}
                className={styles.card}
              >
                {thumbnail ? (
                  <span className={styles.thumb}>
                    <Image src={thumbnail} alt="" fill sizes="72px" className={styles.thumbImage} />
                  </span>
                ) : null}
                <span className={styles.body}>
                  <span className={styles.title}>{title}</span>
                  <span className={styles.summary}>{pickText(project.summary, lang)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export { ArticleRelatedProjects };
