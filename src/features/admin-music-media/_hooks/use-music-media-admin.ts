"use client";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";
import type { OrderedAdminAdapter } from "@/hooks/use-ordered-admin";
import { musicMedia } from "@/lib/firebase/music";
import type { MusicMedia } from "@/types/music";

const musicMediaAdapter: OrderedAdminAdapter<MusicMedia> = musicMedia;

const useMusicMediaAdmin = () => {
  const { items: media, ...admin } = useOrderedAdmin(musicMediaAdapter);
  return { media, ...admin };
};

export { useMusicMediaAdmin };
