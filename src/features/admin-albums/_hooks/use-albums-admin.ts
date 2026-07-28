"use client";

import { useEffect, useState } from "react";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";
import type { OrderedAdminAdapter } from "@/hooks/use-ordered-admin";
import {
  deleteAlbum,
  listAlbumsAdmin,
  setAlbumPublished,
  updateAlbumOrder,
} from "@/lib/firebase/albums";
import { listPhotosAdmin } from "@/lib/firebase/firestore";
import type { Album } from "@/types/album";

const albumsAdapter: OrderedAdminAdapter<Album> = {
  list: listAlbumsAdmin,
  updateOrder: updateAlbumOrder,
  setPublished: setAlbumPublished,
  remove: deleteAlbum,
};

const useAlbumsAdmin = () => {
  const { items: albums, ...admin } = useOrderedAdmin(albumsAdapter);
  const [coverUrls, setCoverUrls] = useState<Map<string, string>>(new Map());
  const [coverError, setCoverError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listPhotosAdmin()
      .then((photos) => {
        if (alive) setCoverUrls(new Map(photos.map((photo) => [photo.id, photo.image?.url ?? ""])));
      })
      .catch((caught: Error) => {
        if (alive) setCoverError(caught.message);
      });
    return () => {
      alive = false;
    };
  }, []);

  return {
    albums,
    coverUrls,
    ...admin,
    status: coverError ? ("error" as const) : admin.status,
    error: admin.error ?? coverError,
  };
};

export { useAlbumsAdmin };
