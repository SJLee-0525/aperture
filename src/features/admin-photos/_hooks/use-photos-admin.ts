"use client";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";
import type { OrderedAdminAdapter } from "@/hooks/use-ordered-admin";
import {
  deletePhoto,
  listPhotosAdmin,
  setPhotoPublished,
  updatePhotoOrder,
} from "@/lib/firebase/firestore";
import { deletePhotoImages } from "@/lib/firebase/storage";
import type { Photo } from "@/types/photo";

const photosAdapter: OrderedAdminAdapter<Photo> = {
  list: listPhotosAdmin,
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
