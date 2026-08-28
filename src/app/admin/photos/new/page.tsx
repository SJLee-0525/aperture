"use client";

import { useState } from "react";

import { PhotoForm } from "@/features/admin-photos/_components/PhotoForm";

import { getPhotoRepository } from "@/lib/admin/photo-repository";

/**
 * 새 사진 — 마운트 시 문서 ID 를 한 번만 선발급해 업로드·저장에 같은 id 를 쓴다.
 */
const NewPhotoPage = () => {
  const [photoId] = useState(() => getPhotoRepository().newId());
  return <PhotoForm photoId={photoId} />;
};

export default NewPhotoPage;
