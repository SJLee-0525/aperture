"use client";

import { useState } from "react";

import { WorkForm } from "@/features/admin-music-works/WorkForm";
import { musicWorks } from "@/lib/firebase/music";

/** 새 연주 — 마운트 시 문서 ID 1회 선발급 후 WorkForm 에 전달(Storage 경로 확정용). */
const NewMusicWorkPage = () => {
  const [workId] = useState(() => musicWorks.newId());
  return <WorkForm workId={workId} />;
};

export default NewMusicWorkPage;
