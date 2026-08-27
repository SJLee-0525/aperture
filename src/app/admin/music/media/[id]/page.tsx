"use client";

import { use } from "react";

import { MediaForm } from "@/features/admin-music-media/_components/MediaForm";
import { AdminDocGate } from "@/features/admin-shell/_components/AdminDocGate";

import { useAdminDocLoad } from "@/hooks/use-admin-doc-load";

import { getMusicMediaRepository } from "@/lib/admin/music-media-repository";

import type { MusicMedia } from "@/types/music";

type Props = { params: Promise<{ id: string }> };

/**
 * 영상 수정 — id 로 로드 후 MediaForm 에 초기값 전달. 없으면 안내 문구.
 *
 * @param {Props} props
 * @param {Promise<{ id: string }>} props.params
 * @returns {JSX.Element}
 */
const EditMusicMediaPage = ({ params }: Props) => {
  const { id } = use(params);
  const { doc, status, error } = useAdminDocLoad<MusicMedia>(getMusicMediaRepository, id);

  return (
    <AdminDocGate status={status} error={error} noun="영상">
      {doc ? <MediaForm mediaId={id} initial={doc} /> : null}
    </AdminDocGate>
  );
};

export default EditMusicMediaPage;
