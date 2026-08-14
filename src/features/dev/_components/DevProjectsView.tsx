"use client";

import { useDevTools } from "@/features/dev/_hooks/use-dev-tools";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useQueryModal } from "@/hooks/use-query-modal";
import { useRegisterChatScreenTarget } from "@/hooks/use-register-chat-screen-target";

import { pickText } from "@/lib/i18n/pick-text";

import type { DevProjectCardData } from "@/types/dev";

import { DevProjectCard } from "./DevProjectCard";
import styles from "./DevProjectsView.module.css";
import { OnDemandDevProjectDetail, preloadDevProjectDetail } from "./OnDemandDevProjectDetail";

/** 가장 좁은 화면의 첫 행 카드 수. 720px 이하가 1열이라 더 주면 화면 밖 이미지를 preload 한다. */
const FIRST_ROW_CARDS = 1;

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
  // WebMCP 도구 — 미지원 브라우저에선 no-op(어댑터 기능 감지).
  useDevTools(projects, select);
  // 개발 수상 모달은 별도 화면 문맥이 없으므로 프로젝트만 등록한다.
  useRegisterChatScreenTarget(
    selected ? { type: "project", id: selected.id, label: pickText(selected.title, lang) } : null,
  );

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{dict.devProjectsNav}</h1>
      {projects.length === 0 ? (
        <p className={styles.empty}>{dict.comingSoon}</p>
      ) : (
        <div className={styles.grid}>
          {projects.map((project, index) => (
            <DevProjectCard
              key={project.id}
              project={project}
              lang={lang}
              onSelect={select}
              onPreload={preloadDevProjectDetail}
              priority={index < FIRST_ROW_CARDS}
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
