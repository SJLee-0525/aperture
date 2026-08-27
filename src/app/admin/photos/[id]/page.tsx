"use client";

import { use } from "react";

import { PhotoForm } from "@/features/admin-photos/_components/PhotoForm";
import { AdminDocGate } from "@/features/admin-shell/_components/AdminDocGate";

import { useAdminDocLoad } from "@/hooks/use-admin-doc-load";

import { getPhotoRepository } from "@/lib/admin/photo-repository";

import type { Photo } from "@/types/photo";

type Props = { params: Promise<{ id: string }> };

/**
 * 사진 수정 — id 로 로드 후 PhotoForm 에 초기값 전달. 없으면 안내 문구.
 *
 * @param {Props} props
 * @param {Promise<{ id: string }>} props.params
 * @returns {JSX.Element}
 */
const EditPhotoPage = ({ params }: Props) => {
  const { id } = use(params);
  const { doc, status, error } = useAdminDocLoad<Photo>(getPhotoRepository, id);

  return (
    <AdminDocGate status={status} error={error} noun="사진">
      {doc ? <PhotoForm photoId={id} initial={doc} /> : null}
    </AdminDocGate>
  );
};

export default EditPhotoPage;
