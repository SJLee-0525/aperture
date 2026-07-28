"use client";

import Image from "next/image";

import { ImageCarousel } from "@/components/ImageCarousel";
import { Modal } from "@/components/Modal";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useQueryModal } from "@/hooks/use-query-modal";
import { hasText } from "@/lib/i18n/has-text";
import { pickText } from "@/lib/i18n/pick-text";
import type { DevProject } from "@/types/dev";

import styles from "./DevProjectsView.module.css";

/** 프로젝트 (/dev/projects) — 카드 그리드. 클릭 시 상세 모달(?project= 딥링크). */
const DevProjectsView = ({ projects }: { projects: DevProject[] }) => {
  const { dict, lang } = useLang();
  const { active: selected, open, select, close } = useQueryModal("project", projects);

  // 상세 미디어 — 갤러리가 비면 커버로 폴백, 둘 다 없으면 미디어 블록 생략.
  const media = selected
    ? selected.images.length > 0
      ? selected.images
      : selected.cover
        ? [selected.cover]
        : []
    : [];

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{dict.devProjectsNav}</h1>

      {projects.length === 0 ? (
        <p className={styles.empty}>{dict.comingSoon}</p>
      ) : (
        <div className={styles.grid}>
          {projects.map((project) => (
            <button
              type="button"
              key={project.id}
              className={styles.card}
              onClick={() => select(project.id)}
            >
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
                <div className={styles.tags}>
                  {project.techTags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={close}
        maxWidth={720}
        mobileFull
        crumb={selected ? `${pickText(selected.category, lang)} · ${selected.year}` : ""}
        label={selected ? pickText(selected.title, lang) : ""}
      >
        {selected ? (
          <div className={styles.detail}>
            {media.length > 0 ? (
              <div className={styles.media}>
                <ImageCarousel images={media} alt={pickText(selected.title, lang)} />
              </div>
            ) : null}

            <header className={styles.mhead}>
              <h2 className={styles.mtitle}>{pickText(selected.title, lang)}</h2>
              {hasText(selected.summary) ? (
                <p className={styles.msub}>{pickText(selected.summary, lang)}</p>
              ) : null}
              {hasText(selected.period) || hasText(selected.position) ? (
                <p className={styles.mmeta}>
                  {[pickText(selected.period, lang), pickText(selected.position, lang)]
                    .filter((text) => text.trim())
                    .join(" · ")}
                </p>
              ) : null}
            </header>

            <div className={styles.secL}>{dict.devOverviewLabel}</div>
            <p className={styles.p}>{pickText(selected.overview, lang)}</p>

            {selected.features.length > 0 ? (
              <>
                <div className={styles.secL}>{dict.devFeaturesLabel}</div>
                <ul className={styles.ul}>
                  {selected.features.map((feature, index) => (
                    <li key={index}>{pickText(feature, lang)}</li>
                  ))}
                </ul>
              </>
            ) : null}

            {selected.roles.length > 0 ? (
              <>
                <div className={styles.secL}>{dict.devRolesLabel}</div>
                <ul className={styles.ul}>
                  {selected.roles.map((role, index) => (
                    <li key={index}>{pickText(role, lang)}</li>
                  ))}
                </ul>
              </>
            ) : null}

            {selected.troubleshooting.length > 0 ? (
              <>
                <div className={styles.secL}>{dict.devTroubleLabel}</div>
                <div className={styles.tsList}>
                  {selected.troubleshooting.map((item, index) => (
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

            {selected.achievements.length > 0 ? (
              <>
                <div className={styles.secL}>{dict.devAchievementsLabel}</div>
                <ul className={styles.ul}>
                  {selected.achievements.map((achievement, index) => (
                    <li key={index}>{pickText(achievement, lang)}</li>
                  ))}
                </ul>
              </>
            ) : null}

            <div className={styles.secL}>{dict.devStackLabel}</div>
            <div className={styles.mtags}>
              {selected.techTags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>

            {selected.links.length > 0 ? (
              <div className={styles.btns}>
                {selected.links.map((link) => (
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
          </div>
        ) : null}
      </Modal>
    </main>
  );
};

export { DevProjectsView };
