"use client";

import { useState } from "react";

import { AwardForm } from "@/features/admin-music-awards/AwardForm";
import { musicAwards } from "@/lib/firebase/music";

/** 새 수상 — 마운트 시 문서 ID 1회 선발급 후 AwardForm 에 전달. */
const NewMusicAwardPage = () => {
  const [awardId] = useState(() => musicAwards.newId());
  return <AwardForm awardId={awardId} />;
};

export default NewMusicAwardPage;
