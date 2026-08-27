"use client";

import { use } from "react";

import { AlbumForm } from "@/features/admin-albums/_components/AlbumForm";
import { AdminDocGate } from "@/features/admin-shell/_components/AdminDocGate";

import { useAdminDocLoad } from "@/hooks/use-admin-doc-load";

import { getAlbumRepository } from "@/lib/admin/album-repository";

import type { Album } from "@/types/album";

type Props = { params: Promise<{ id: string }> };

/**
 * 앨범 수정 — id 로 로드 후 AlbumForm 에 초기값 전달. 없으면 안내 문구.
 *
 * @param {Props} props
 * @param {Promise<{ id: string }>} props.params
 * @returns {JSX.Element}
 */
const EditAlbumPage = ({ params }: Props) => {
  const { id } = use(params);
  const { doc, status, error } = useAdminDocLoad<Album>(getAlbumRepository, id);

  return (
    <AdminDocGate status={status} error={error} noun="앨범">
      {doc ? <AlbumForm albumId={id} initial={doc} /> : null}
    </AdminDocGate>
  );
};

export default EditAlbumPage;
