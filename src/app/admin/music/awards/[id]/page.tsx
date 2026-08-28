"use client";

import { use } from "react";

import { AwardForm } from "@/features/admin-music-awards/_components/AwardForm";
import { AdminDocGate } from "@/features/admin-shell/_components/AdminDocGate";

import { getMusicAwardRepository } from "@/lib/admin/music-award-repository";


type Props = { params: Promise<{ id: string }> };

/**
 * 수상 수정 — id 로 로드 후 AwardForm 에 초기값 전달. 없으면 안내 문구.
 */
const EditMusicAwardPage = ({ params }: Props) => {
  const { id } = use(params);

  return (
    <AdminDocGate getRepository={getMusicAwardRepository} id={id} noun="수상">
      {(doc) => <AwardForm awardId={id} initial={doc} />}
    </AdminDocGate>
  );
};

export default EditMusicAwardPage;
