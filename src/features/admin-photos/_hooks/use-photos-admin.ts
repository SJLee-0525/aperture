"use client";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";
import type { OrderedAdminAdapter } from "@/hooks/use-ordered-admin";
import { deletePhoto, setPhotoPublished, updatePhotoOrder } from "@/lib/firebase/firestore";
import { listPhotoItemsAdmin } from "@/lib/firebase/admin-list-rest";
import { deletePhotoImages } from "@/lib/firebase/storage";
import type { AdminPhotoListItem } from "@/types/admin";

const photosAdapter: OrderedAdminAdapter<AdminPhotoListItem> = {
  list: listPhotoItemsAdmin,
  updateOrder: updatePhotoOrder,
  setPublished: setPhotoPublished,
  remove: async (id) => {
    await deletePhoto(id);
    await deletePhotoImages(id).catch(() => undefined);
  },
};

const usePhotosAdmin = () => {
  const { items: photos, ...admin } = useOrderedAdmin(photosAdapter);
  return { photos, ...admin };
};

export { usePhotosAdmin };
