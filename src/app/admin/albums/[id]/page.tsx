"use client";

import { use } from "react";

import { AlbumForm } from "@/features/admin-albums/_components/AlbumForm";
import { AdminDocGate } from "@/features/admin-shell/_components/AdminDocGate";

import { getAlbumRepository } from "@/lib/admin/album-repository";


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

  return (
    <AdminDocGate getRepository={getAlbumRepository} id={id} noun="앨범">
      {(doc) => <AlbumForm albumId={id} initial={doc} />}
    </AdminDocGate>
  );
};

export default EditAlbumPage;
