"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Modal } from "@/components/Modal";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { DevProject, DevProjectCardData } from "@/types/dev";

import styles from "./OnDemandDevProjectDetail.module.css";

const loadDevProjectDetail = () => import("./DevProjectDetail");
const DevProjectDetail = dynamic(
  () => loadDevProjectDetail().then((module) => module.DevProjectDetail),
  { ssr: false },
);

const preloadDevProjectDetail = () => {
  void loadDevProjectDetail();
};

type Props = {
  project: DevProjectCardData | null;
  open: boolean;
  onClose: () => void;
  endpoint: string;
};

/** 프로젝트 상세 데이터와 무거운 모달 UI를 실제 선택 시에만 불러온다. */
const OnDemandDevProjectDetail = ({ project, open, onClose, endpoint }: Props) => {
  const { dict, lang } = useLang();
  const [projectsById, setProjectsById] = useState<Map<string, DevProject>>(() => new Map());
  const [failedId, setFailedId] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const activeId = project?.id ?? null;
  const detail = activeId ? projectsById.get(activeId) : undefined;

  useEffect(() => {
    if (!open || !activeId || projectsById.has(activeId)) return;

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
        setProjectsById((current) => {
          const next = new Map(current);
          next.set(loadedProject.id, loadedProject);
          return next;
        });
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setFailedId(activeId);
      });

    return () => controller.abort();
  }, [activeId, endpoint, open, projectsById, retry]);

  if (!open || !project) return null;

  if (detail) {
    return <DevProjectDetail project={detail} open onClose={onClose} />;
  }

  const failed = failedId === activeId;
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
    >
      <div className={styles.state}>
        {failed ? (
          <>
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
          </>
        ) : (
          <span className={styles.spinner} aria-label={dict.devProjectLoadingLabel} />
        )}
      </div>
    </Modal>
  );
};

export { OnDemandDevProjectDetail, preloadDevProjectDetail };
