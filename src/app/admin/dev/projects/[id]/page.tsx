"use client";

import { use } from "react";

import { ProjectForm } from "@/features/admin-dev-projects/_components/ProjectForm";
import { AdminDocGate } from "@/features/admin-shell/_components/AdminDocGate";

import { useAdminDocLoad } from "@/hooks/use-admin-doc-load";

import { getDevProjectRepository } from "@/lib/admin/dev-project-repository";

import type { DevProject } from "@/types/dev";

type Props = { params: Promise<{ id: string }> };

/**
 * 프로젝트 수정 — id 로 로드 후 ProjectForm 에 초기값 전달. 없으면 안내 문구.
 *
 * @param {Props} props
 * @param {Promise<{ id: string }>} props.params
 * @returns {JSX.Element}
 */
const EditDevProjectPage = ({ params }: Props) => {
  const { id } = use(params);
  const { doc, status, error } = useAdminDocLoad<DevProject>(getDevProjectRepository, id);

  return (
    <AdminDocGate status={status} error={error} noun="프로젝트">
      {doc ? <ProjectForm projectId={id} initial={doc} /> : null}
    </AdminDocGate>
  );
};

export default EditDevProjectPage;
