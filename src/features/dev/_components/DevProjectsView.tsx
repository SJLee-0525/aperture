"use client";

import { useDevTools } from "@/features/dev/_hooks/use-dev-tools";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useQueryModal } from "@/hooks/use-query-modal";
import { useRegisterChatScreenTarget } from "@/hooks/use-register-chat-screen-target";

import { pickText } from "@/lib/i18n/pick-text";

import type { DevProjectCardData } from "@/types/dev";
import type { DevArticleProjectLink } from "@/types/dev-article";

import { DevProjectCard } from "./DevProjectCard";
import styles from "./DevProjectsView.module.css";
import { OnDemandDevProjectDetail, preloadDevProjectDetail } from "./OnDemandDevProjectDetail";

/** 가장 좁은 화면의 첫 행 카드 수. 720px 이하가 1열이라 더 주면 화면 밖 이미지를 preload 한다. */
const FIRST_ROW_CARDS = 1;

/** 연관 글이 없는 프로젝트가 매 렌더 새 배열을 받지 않도록 하나를 나눠 쓴다. */
const NO_ARTICLES: DevArticleProjectLink[] = [];

type Props = {
  projects: DevProjectCardData[];
  /** 프로젝트 id → 그 프로젝트를 지목한 공개 글. 관계의 원천은 글이라 서버에서 뒤집어 온다. */
  articlesByProject: Record<string, DevArticleProjectLink[]>;
};

/**
 * 프로젝트 목록과 URL 기반 상세 선택을 조율한다.
 *
 * @param {Props} props
 * @param {DevProjectCardData[]} props.projects
 * @param {Record<string, DevArticleProjectLink[]>} props.articlesByProject
 * @returns {JSX.Element}
 */
const DevProjectsView = ({ projects, articlesByProject }: Props) => {
  const { dict, lang } = useLang();
  const { active: selected, open, select, close } = useQueryModal("project", projects);
  // WebMCP 도구 — 미지원 브라우저에선 no-op(어댑터 기능 감지).
  useDevTools(projects, select);
  // 개발 수상 모달은 별도 화면 문맥이 없으므로 프로젝트만 등록한다.
  useRegisterChatScreenTarget(
    selected ? { type: "project", id: selected.id, label: pickText(selected.title, lang) } : null,
  );

  // 프로젝트 id 는 관리자가 정하는 문서 ID 라 `constructor` 처럼 프로토타입에 이미 있는 이름이
  // 올 수 있다. 자기 속성일 때만 읽어 상속받은 값을 목록으로 넘기지 않는다.
  const selectedArticles =
    selected && Object.hasOwn(articlesByProject, selected.id)
      ? articlesByProject[selected.id]
      : NO_ARTICLES;

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
        articles={selectedArticles}
        open={open}
        onClose={close}
        endpoint="/api/dev-projects"
      />
    </main>
  );
};

export { DevProjectsView };
