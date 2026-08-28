"use client";

import { use } from "react";

import { PhotoForm } from "@/features/admin-photos/_components/PhotoForm";
import { AdminDocGate } from "@/features/admin-shell/_components/AdminDocGate";

import { getPhotoRepository } from "@/lib/admin/photo-repository";

type Props = { params: Promise<{ id: string }> };

/**
 * 사진 수정 — id 로 로드 후 PhotoForm 에 초기값 전달. 없으면 안내 문구.
 */
const EditPhotoPage = ({ params }: Props) => {
  const { id } = use(params);

  return (
    <AdminDocGate getRepository={getPhotoRepository} id={id} noun="사진">
      {(doc) => <PhotoForm photoId={id} initial={doc} />}
    </AdminDocGate>
  );
};

export default EditPhotoPage;
