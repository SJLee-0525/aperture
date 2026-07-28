"use client";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";
import type { OrderedAdminAdapter } from "@/hooks/use-ordered-admin";
import { musicAwards } from "@/lib/firebase/music";
import type { MusicAward } from "@/types/music";

const musicAwardsAdapter: OrderedAdminAdapter<MusicAward> = musicAwards;

const useMusicAwardsAdmin = () => {
  const { items: awards, ...admin } = useOrderedAdmin(musicAwardsAdapter);
  return { awards, ...admin };
};

export { useMusicAwardsAdmin };
