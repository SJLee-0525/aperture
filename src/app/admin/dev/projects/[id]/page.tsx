"use client";

import { use } from "react";

import { ProjectForm } from "@/features/admin-dev-projects/_components/ProjectForm";
import { AdminDocGate } from "@/features/admin-shell/_components/AdminDocGate";

import { getDevProjectRepository } from "@/lib/admin/dev-project-repository";


type Props = { params: Promise<{ id: string }> };

/**
 * 프로젝트 수정 — id 로 로드 후 ProjectForm 에 초기값 전달. 없으면 안내 문구.
 */
const EditDevProjectPage = ({ params }: Props) => {
  const { id } = use(params);

  return (
    <AdminDocGate getRepository={getDevProjectRepository} id={id} noun="프로젝트">
      {(doc) => <ProjectForm projectId={id} initial={doc} />}
    </AdminDocGate>
  );
};

export default EditDevProjectPage;
