"use client";

import { useState } from "react";

import { MediaForm } from "@/features/admin-music-media/MediaForm";
import { musicMedia } from "@/lib/firebase/music";

/** 새 영상 — 마운트 시 문서 ID 1회 선발급 후 MediaForm 에 전달. */
const NewMusicMediaPage = () => {
  const [mediaId] = useState(() => musicMedia.newId());
  return <MediaForm mediaId={mediaId} />;
};

export default NewMusicMediaPage;
