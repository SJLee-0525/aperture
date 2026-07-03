"use client";

import { use, useEffect, useState } from "react";

import { ProjectForm } from "@/features/admin-dev-projects/ProjectForm";
import { devProjects } from "@/lib/firebase/dev";
import type { DevProject } from "@/types/dev";

import styles from "./page.module.css";

type Status = "loading" | "found" | "missing" | "error";

type Props = { params: Promise<{ id: string }> };

/** 프로젝트 수정 — id 로 로드 후 ProjectForm 에 초기값 전달. 없으면 안내 문구. */
const EditDevProjectPage = ({ params }: Props) => {
  const { id } = use(params);
  const [project, setProject] = useState<DevProject | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    devProjects
      .get(id)
      .then((loaded) => {
        if (!alive) return;
        if (loaded) {
          setProject(loaded);
          setStatus("found");
        } else {
          setStatus("missing");
        }
      })
      .catch((caught: Error) => {
        if (!alive) return;
        setError(caught.message);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (status === "loading") return <p className={styles.state}>불러오는 중…</p>;
  if (status === "missing") return <p className={styles.state}>프로젝트를 찾을 수 없습니다.</p>;
  if (status === "error")
    return (
      <p className={styles.stateError} role="alert">
        {error ?? "프로젝트를 불러오지 못했습니다."}
      </p>
    );

  return project ? <ProjectForm projectId={id} initial={project} /> : null;
};

export default EditDevProjectPage;
