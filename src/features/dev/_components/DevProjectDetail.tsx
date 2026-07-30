import { ImageCarousel } from "@/components/ImageCarousel";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { hasText } from "@/lib/i18n/has-text";
import { pickText } from "@/lib/i18n/pick-text";
import type { DevProject } from "@/types/dev";

import styles from "./DevProjectsView.module.css";

type Props = {
  project: DevProject;
};

/** 선택된 프로젝트의 전체 설명과 외부 링크를 표시한다. 모달 프레임은 상위가 소유한다. */
const DevProjectDetailContent = ({ project }: Props) => {
  const { dict, lang } = useLang();
  const media = project.images.length > 0 ? project.images : project.cover ? [project.cover] : [];

  return (
    <div className={styles.detail}>
      {media.length > 0 ? (
        <div className={styles.media}>
          <ImageCarousel
            images={media}
            alt={pickText(project.title, lang)}
            closeLabel={dict.closeLabel}
            previousLabel={dict.previousImageLabel}
            nextLabel={dict.nextImageLabel}
          />
        </div>
      ) : null}

      <header className={styles.mhead}>
        <h2 className={styles.mtitle}>{pickText(project.title, lang)}</h2>
        {hasText(project.summary) ? (
          <p className={styles.msub}>{pickText(project.summary, lang)}</p>
        ) : null}
        {hasText(project.period) || hasText(project.position) ? (
          <p className={styles.mmeta}>
            {[pickText(project.period, lang), pickText(project.position, lang)]
              .filter((text) => text.trim())
              .join(" · ")}
          </p>
        ) : null}
      </header>

      {project.links.length > 0 ? (
        <div className={styles.btns}>
          {project.links.map((link) => (
            <a
              key={link.href}
              className={styles.btn}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      ) : null}

      <div className={styles.secL}>{dict.devOverviewLabel}</div>
      <p className={styles.p}>{pickText(project.overview, lang)}</p>

      {project.features.length > 0 ? (
        <>
          <div className={styles.secL}>{dict.devFeaturesLabel}</div>
          <ul className={styles.ul}>
            {project.features.map((feature, index) => (
              <li key={index}>{pickText(feature, lang)}</li>
            ))}
          </ul>
        </>
      ) : null}

      {project.roles.length > 0 ? (
        <>
          <div className={styles.secL}>{dict.devRolesLabel}</div>
          <ul className={styles.ul}>
            {project.roles.map((role, index) => (
              <li key={index}>{pickText(role, lang)}</li>
            ))}
          </ul>
        </>
      ) : null}

      {project.troubleshooting.length > 0 ? (
        <>
          <div className={styles.secL}>{dict.devTroubleLabel}</div>
          <div className={styles.tsList}>
            {project.troubleshooting.map((item, index) => (
              <div key={index} className={styles.tsItem}>
                {hasText(item.title) ? (
                  <div className={styles.tsTitle}>{pickText(item.title, lang)}</div>
                ) : null}
                {hasText(item.problem) ? (
                  <div className={styles.tsRow}>
                    <span className={styles.tsLabel}>{dict.devTroubleProblemLabel}</span>
                    <p className={styles.tsText}>{pickText(item.problem, lang)}</p>
                  </div>
                ) : null}
                {hasText(item.solution) ? (
                  <div className={styles.tsRow}>
                    <span className={styles.tsLabel}>{dict.devTroubleSolutionLabel}</span>
                    <p className={styles.tsText}>{pickText(item.solution, lang)}</p>
                  </div>
                ) : null}
                {item.result && hasText(item.result) ? (
                  <div className={styles.tsRow}>
                    <span className={`${styles.tsLabel} ${styles.tsResultLabel}`}>
                      {dict.devTroubleResultLabel}
                    </span>
                    <p className={styles.tsText}>{pickText(item.result, lang)}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}

      {project.achievements.length > 0 ? (
        <>
          <div className={styles.secL}>{dict.devAchievementsLabel}</div>
          <ul className={styles.ul}>
            {project.achievements.map((achievement, index) => (
              <li key={index}>{pickText(achievement, lang)}</li>
            ))}
          </ul>
        </>
      ) : null}

      <div className={styles.secL}>{dict.devStackLabel}</div>
      <div className={styles.mtags}>
        {project.techTags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </div>
  );
};

export { DevProjectDetailContent };
