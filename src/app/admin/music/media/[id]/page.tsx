"use client";

import { use } from "react";

import { MediaForm } from "@/features/admin-music-media/_components/MediaForm";
import { AdminDocGate } from "@/features/admin-shell/_components/AdminDocGate";

import { getMusicMediaRepository } from "@/lib/admin/music-media-repository";


type Props = { params: Promise<{ id: string }> };

/**
 * 영상 수정 — id 로 로드 후 MediaForm 에 초기값 전달. 없으면 안내 문구.
 */
const EditMusicMediaPage = ({ params }: Props) => {
  const { id } = use(params);

  return (
    <AdminDocGate getRepository={getMusicMediaRepository} id={id} noun="영상">
      {(doc) => <MediaForm mediaId={id} initial={doc} />}
    </AdminDocGate>
  );
};

export default EditMusicMediaPage;
