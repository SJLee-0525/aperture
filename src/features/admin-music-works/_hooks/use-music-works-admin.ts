"use client";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";
import type { OrderedAdminAdapter } from "@/hooks/use-ordered-admin";
import { musicWorks } from "@/lib/firebase/music";
import { listMusicWorkItemsAdmin } from "@/lib/firebase/admin-list-rest";
import type { AdminMusicWorkListItem } from "@/types/admin";

const musicWorksAdapter: OrderedAdminAdapter<AdminMusicWorkListItem> = {
  ...musicWorks,
  list: listMusicWorkItemsAdmin,
};

const useMusicWorksAdmin = () => {
  const { items: works, ...admin } = useOrderedAdmin(musicWorksAdapter);
  return { works, ...admin };
};

export { useMusicWorksAdmin };
