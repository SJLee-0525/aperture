"use client";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useQueryModal } from "@/hooks/use-query-modal";
import type { DevProjectCardData } from "@/types/dev";

import { DevProjectCard } from "./DevProjectCard";
import { OnDemandDevProjectDetail, preloadDevProjectDetail } from "./OnDemandDevProjectDetail";
import styles from "./DevProjectsView.module.css";

/**
 * 프로젝트 목록과 URL 기반 상세 선택을 조율한다.
 *
 * @param {{ projects: DevProjectCardData[] }} props
 * @param {DevProjectCardData[]} props.projects
 * @returns {JSX.Element}
 */
const DevProjectsView = ({ projects }: { projects: DevProjectCardData[] }) => {
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
            <DevProjectCard
              key={project.id}
              project={project}
              lang={lang}
              onSelect={select}
              onPreload={preloadDevProjectDetail}
            />
          ))}
        </div>
      )}
      <OnDemandDevProjectDetail
        project={selected}
        open={open}
        onClose={close}
        endpoint="/api/dev-projects"
      />
    </main>
  );
};

export { DevProjectsView };
