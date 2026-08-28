"use client";

import { useState } from "react";

import { ProjectForm } from "@/features/admin-dev-projects/_components/ProjectForm";

import { getDevProjectRepository } from "@/lib/admin/dev-project-repository";

/**
 * 새 프로젝트 — 마운트 시 문서 ID 1회 선발급 후 ProjectForm 에 전달(Storage 경로 확정용).
 */
const NewDevProjectPage = () => {
  const [projectId] = useState(() => getDevProjectRepository().newId());
  return <ProjectForm projectId={projectId} />;
};

export default NewDevProjectPage;
