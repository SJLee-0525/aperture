"use client";

import Image from "next/image";

import { Modal } from "@/components/Modal";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useQueryModal } from "@/hooks/use-query-modal";
import { pickText } from "@/lib/i18n/pick-text";
import type { DevProject } from "@/types/dev";

import styles from "./DevProjectsView.module.css";

/** 프로젝트 (/dev/projects) — 카드 그리드. 클릭 시 상세 모달(?project= 딥링크). */
const DevProjectsView = ({ projects }: { projects: DevProject[] }) => {
  const { dict, lang } = useLang();
  const { active: selected, open, select, close } = useQueryModal("project", projects);

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
        crumb={selected ? `${pickText(selected.category, lang)} · ${selected.year}` : ""}
        label={selected ? pickText(selected.title, lang) : ""}
      >
        {selected ? (
          <div className={styles.detail}>
            <div className={styles.gallery}>
              {selected.images.length > 0 ? (
                selected.images.map((img, index) => (
                  <div key={img.path || index} className={styles.shot}>
                    <Image
                      src={img.url}
                      alt={`${pickText(selected.title, lang)} — ${index + 1}`}
                      fill
                      sizes="(max-width: 760px) 100vw, 680px"
                      className={styles.shotImg}
                    />
                  </div>
                ))
              ) : (
                <div className={styles.shot}>
                  <span className={styles.shotEmpty}>NO IMAGE</span>
                </div>
              )}
            </div>

            <div className={styles.secL}>{dict.devOverviewLabel}</div>
            <p className={styles.p}>{pickText(selected.overview, lang)}</p>

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
                <ul className={styles.ul}>
                  {selected.troubleshooting.map((item, index) => (
                    <li key={index}>{pickText(item, lang)}</li>
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
