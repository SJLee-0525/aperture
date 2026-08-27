"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { Modal } from "@/components/Modal";
import { Skeleton } from "@/components/Skeleton";

import { useLang } from "@/features/lang/_hooks/use-lang";

import { pickText } from "@/lib/i18n/pick-text";

import { setCursorLoading } from "@/utils/custom-cursor-events";

import type { DevProject, DevProjectCardData } from "@/types/dev";
import type { DevArticleProjectLink } from "@/types/dev-article";

import detailStyles from "./DevProjectsView.module.css";
import styles from "./OnDemandDevProjectDetail.module.css";

const DetailSkeleton = ({ hasMedia = true, label }: { hasMedia?: boolean; label?: string }) => (
  <div
    className={`${detailStyles.detail} ${styles.skeleton}`}
    role={label ? "status" : undefined}
    aria-label={label}
  >
    {hasMedia ? (
      <div className={detailStyles.media}>
        <Skeleton aspectRatio={16 / 9} />
      </div>
    ) : null}

    <header className={`${detailStyles.mhead} ${styles.skeletonHead}`}>
      <Skeleton width="62%" height={34} />
      <Skeleton width="88%" height={16} />
      <Skeleton width="46%" height={12} />
    </header>

    <div className={detailStyles.btns}>
      <Skeleton width={104} height={39} radius={6} />
      <Skeleton width={88} height={39} radius={6} />
    </div>

    <h3 className={detailStyles.secL}>
      <Skeleton width={96} height={20} />
    </h3>
    <div className={styles.skeletonCopy}>
      <Skeleton height={14} />
      <Skeleton width="94%" height={14} />
      <Skeleton width="72%" height={14} />
    </div>

    <h3 className={detailStyles.secL}>
      <Skeleton width={76} height={20} />
    </h3>
    <div className={detailStyles.mtags}>
      {[72, 94, 64, 86].map((width) => (
        <Skeleton key={width} width={width} height={27} radius={999} />
      ))}
    </div>
  </div>
);

const loadDevProjectDetail = () => import("./DevProjectDetail");
const DevProjectDetailContent = dynamic(
  () => loadDevProjectDetail().then((module) => module.DevProjectDetailContent),
  {
    ssr: false,
    loading: () => <DetailSkeleton />,
  },
);

const preloadDevProjectDetail = () => {
  void loadDevProjectDetail();
};

type Props = {
  project: DevProjectCardData | null;
  /** 선택된 프로젝트를 지목한 공개 글. 상세 데이터와 달리 목록 지면이 이미 갖고 있다. */
  articles: DevArticleProjectLink[];
  open: boolean;
  onClose: () => void;
  endpoint: string;
};

/**
 * 프로젝트 상세 데이터와 무거운 모달 UI를 실제 선택 시에만 불러온다.
 *
 * @param {Props} props
 * @param {DevProjectCardData | null} props.project
 * @param {DevArticleProjectLink[]} props.articles
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.endpoint
 * @returns {JSX.Element | null}
 */
const OnDemandDevProjectDetail = ({ project, articles, open, onClose, endpoint }: Props) => {
  const { dict, lang } = useLang();
  const [projectsById, setProjectsById] = useState<Map<string, DevProject>>(() => new Map());
  const projectsByIdRef = useRef(projectsById);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const activeId = project?.id ?? null;
  const detail = activeId ? projectsById.get(activeId) : undefined;
  const failed = failedId === activeId;
  const detailLoaded = detail != null;

  useEffect(() => {
    if (!open || !activeId) return;
    const loadingId = `dev-project-detail:${activeId}`;
    setCursorLoading(loadingId, !detailLoaded && !failed);
    return () => setCursorLoading(loadingId, false);
  }, [activeId, detailLoaded, failed, open]);

  useEffect(() => {
    if (!open || !activeId || projectsByIdRef.current.has(activeId)) return;

    preloadDevProjectDetail();
    const controller = new AbortController();

    fetch(`${endpoint}/${encodeURIComponent(activeId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Project detail request failed: ${response.status}`);
        return (await response.json()) as DevProject;
      })
      .then((loadedProject) => {
        // ref 는 "이미 받아온 프로젝트" 판정의 단일 출처다. setState updater 안에서 바꾸면
        // React 가 결과를 버릴 때 ref 만 앞서가고, 다음 열기에서 요청을 건너뛴 채 상세가
        // 비어 모달이 스켈레톤에 머문다.
        const next = new Map(projectsByIdRef.current);
        next.set(loadedProject.id, loadedProject);
        projectsByIdRef.current = next;
        setProjectsById(next);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setFailedId(activeId);
      });

    return () => controller.abort();
  }, [activeId, endpoint, open, retry]);

  if (!open || !project) return null;

  const label = pickText(project.title, lang);
  const crumb = `${pickText(project.category, lang)} · ${project.year}`;

  return (
    <Modal
      open
      onClose={onClose}
      closeLabel={dict.closeLabel}
      maxWidth={720}
      mobileFull
      crumb={crumb}
      label={label}
      shareTitle={label}
      shareLabel={dict.shareLabel}
    >
      {detail ? (
        <DevProjectDetailContent project={detail} articles={articles} />
      ) : !failed ? (
        <DetailSkeleton hasMedia={Boolean(project.cover)} label={dict.devProjectLoadingLabel} />
      ) : (
        <div className={styles.state}>
          <p>{dict.devProjectLoadError}</p>
          <button
            type="button"
            className={styles.retry}
            onClick={() => {
              setFailedId(null);
              setRetry((value) => value + 1);
            }}
          >
            {dict.errorRetry}
          </button>
        </div>
      )}
    </Modal>
  );
};

export { OnDemandDevProjectDetail, preloadDevProjectDetail };
