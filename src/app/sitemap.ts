import type { MetadataRoute } from "next";

import { ROUTES, albumRoute } from "@/constants/routes";
import { getAlbums } from "@/lib/content/get-albums";
import { absoluteUrl } from "@/lib/seo/site-url";

const PUBLIC_ROUTES = [
  ROUTES.LANDING,
  ROUTES.PHOTO,
  ROUTES.PHOTO_ALBUMS,
  ROUTES.PHOTO_MAP,
  ROUTES.PHOTO_ABOUT,
  ROUTES.MUSIC,
  ROUTES.MUSIC_CAREER,
  ROUTES.MUSIC_MEDIA,
  ROUTES.MUSIC_ABOUT,
  ROUTES.DEV,
  ROUTES.DEV_PROJECTS,
  ROUTES.DEV_CAREER,
  ROUTES.DEV_ABOUT,
  ROUTES.CONTACT,
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const albums = await getAlbums();
  const routes = [...PUBLIC_ROUTES, ...albums.map((album) => albumRoute(album.id))];

  return routes.map((route) => ({
    url: absoluteUrl(route),
    changeFrequency: route === ROUTES.LANDING ? "weekly" : "monthly",
    priority: route === ROUTES.LANDING ? 1 : route.split("/").length <= 3 ? 0.8 : 0.7,
  }));
}
