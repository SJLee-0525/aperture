"use client";

import { use } from "react";

import { AwardForm } from "@/features/admin-music-awards/_components/AwardForm";
import { AdminDocGate } from "@/features/admin-shell/_components/AdminDocGate";

import { useAdminDocLoad } from "@/hooks/use-admin-doc-load";

import { getMusicAwardRepository } from "@/lib/admin/music-award-repository";

import type { MusicAward } from "@/types/music";

type Props = { params: Promise<{ id: string }> };

/**
 * 수상 수정 — id 로 로드 후 AwardForm 에 초기값 전달. 없으면 안내 문구.
 *
 * @param {Props} props
 * @param {Promise<{ id: string }>} props.params
 * @returns {JSX.Element}
 */
const EditMusicAwardPage = ({ params }: Props) => {
  const { id } = use(params);
  const { doc, status, error } = useAdminDocLoad<MusicAward>(getMusicAwardRepository, id);

  return (
    <AdminDocGate status={status} error={error} noun="수상">
      {doc ? <AwardForm awardId={id} initial={doc} /> : null}
    </AdminDocGate>
  );
};

export default EditMusicAwardPage;
