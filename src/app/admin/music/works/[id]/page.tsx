"use client";

import { use } from "react";

import { WorkForm } from "@/features/admin-music-works/_components/WorkForm";
import { AdminDocGate } from "@/features/admin-shell/_components/AdminDocGate";

import { getMusicWorkRepository } from "@/lib/admin/music-work-repository";


type Props = { params: Promise<{ id: string }> };

/**
 * 연주 수정 — id 로 로드 후 WorkForm 에 초기값 전달. 없으면 안내 문구.
 *
 * @param {Props} props
 * @param {Promise<{ id: string }>} props.params
 * @returns {JSX.Element}
 */
const EditMusicWorkPage = ({ params }: Props) => {
  const { id } = use(params);

  return (
    <AdminDocGate getRepository={getMusicWorkRepository} id={id} noun="연주">
      {(doc) => <WorkForm workId={id} initial={doc} />}
    </AdminDocGate>
  );
};

export default EditMusicWorkPage;
