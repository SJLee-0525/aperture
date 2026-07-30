"use client";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";
import type { OrderedAdminAdapter } from "@/hooks/use-ordered-admin";
import { deleteAlbum, setAlbumPublished, updateAlbumOrder } from "@/lib/firebase/albums";
import { listAlbumItemsAdmin } from "@/lib/firebase/admin-list-rest";
import type { AdminAlbumListItem } from "@/types/admin";

const albumsAdapter: OrderedAdminAdapter<AdminAlbumListItem> = {
  list: listAlbumItemsAdmin,
  updateOrder: updateAlbumOrder,
  setPublished: setAlbumPublished,
  remove: deleteAlbum,
};

const useAlbumsAdmin = () => {
  const { items: albums, ...admin } = useOrderedAdmin(albumsAdapter);
  return { albums, ...admin };
};

export { useAlbumsAdmin };
