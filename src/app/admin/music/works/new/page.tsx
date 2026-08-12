"use client";

import { useState } from "react";

import { WorkForm } from "@/features/admin-music-works/_components/WorkForm";
import { getMusicWorkRepository } from "@/lib/admin/music-work-repository";

/**
 * 새 연주 — 마운트 시 문서 ID 1회 선발급 후 WorkForm 에 전달(Storage 경로 확정용).
 *
 * @returns {JSX.Element}
 */
const NewMusicWorkPage = () => {
  const [workId] = useState(() => getMusicWorkRepository().newId());
  return <WorkForm workId={workId} />;
};

export default NewMusicWorkPage;
