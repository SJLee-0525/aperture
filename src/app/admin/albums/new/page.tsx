"use client";

import { useState } from "react";

import { AlbumForm } from "@/features/admin-albums/_components/AlbumForm";

import { getAlbumRepository } from "@/lib/admin/album-repository";

/**
 * 새 앨범 — 마운트 시 문서 ID 1회 선발급 후 AlbumForm 에 전달.
 */
const NewAlbumPage = () => {
  const [albumId] = useState(() => getAlbumRepository().newId());
  return <AlbumForm albumId={albumId} />;
};

export default NewAlbumPage;
