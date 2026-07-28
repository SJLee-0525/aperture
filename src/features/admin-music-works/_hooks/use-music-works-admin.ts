"use client";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";
import type { OrderedAdminAdapter } from "@/hooks/use-ordered-admin";
import { musicWorks } from "@/lib/firebase/music";
import type { MusicWork } from "@/types/music";

const musicWorksAdapter: OrderedAdminAdapter<MusicWork> = musicWorks;

const useMusicWorksAdmin = () => {
  const { items: works, ...admin } = useOrderedAdmin(musicWorksAdapter);
  return { works, ...admin };
};

export { useMusicWorksAdmin };
