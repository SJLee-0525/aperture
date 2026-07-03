"use client";

import { useState } from "react";

import { ProjectForm } from "@/features/admin-dev-projects/ProjectForm";
import { devProjects } from "@/lib/firebase/dev";

/** 새 프로젝트 — 마운트 시 문서 ID 1회 선발급 후 ProjectForm 에 전달(Storage 경로 확정용). */
const NewDevProjectPage = () => {
  const [projectId] = useState(() => devProjects.newId());
  return <ProjectForm projectId={projectId} />;
};

export default NewDevProjectPage;
