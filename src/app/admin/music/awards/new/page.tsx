"use client";

import { useState } from "react";

import { AwardForm } from "@/features/admin-music-awards/_components/AwardForm";
import { getMusicAwardRepository } from "@/lib/admin/music-award-repository";

/**
 * 새 수상 — 마운트 시 문서 ID 1회 선발급 후 AwardForm 에 전달.
 *
 * @returns {JSX.Element}
 */
const NewMusicAwardPage = () => {
  const [awardId] = useState(() => getMusicAwardRepository().newId());
  return <AwardForm awardId={awardId} />;
};

export default NewMusicAwardPage;
