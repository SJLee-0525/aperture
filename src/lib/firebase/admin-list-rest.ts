"use client";

import { auth } from "@/lib/firebase/client";
import type {
  AdminAlbumListItem,
  AdminDevProjectListItem,
  AdminMusicWorkListItem,
  AdminPhotoListItem,
} from "@/types/admin";
import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";

type RestValue = Record<string, unknown>;
type RestDocument = { name: string; fields?: Record<string, RestValue> };

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const documentsUrl = () =>
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const decodeValue = (value: RestValue | undefined): unknown => {
  if (!value || "nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("mapValue" in value) {
    const fields = (value.mapValue as { fields?: Record<string, RestValue> }).fields ?? {};
    return decodeFields(fields);
  }
  if ("arrayValue" in value) {
    const values = (value.arrayValue as { values?: RestValue[] }).values ?? [];
    return values.map(decodeValue);
  }
  return null;
};

const decodeFields = (fields: Record<string, RestValue>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));

const listProjected = async (
  collectionId: string,
  fieldPaths: string[],
): Promise<Array<{ id: string; data: Record<string, unknown> }>> => {
  const user = auth.currentUser;
  if (!user) throw new Error("관리자 로그인이 필요합니다.");
  const token = await user.getIdToken();
  const response = await fetch(`${documentsUrl()}:runQuery?key=${API_KEY}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        select: { fields: fieldPaths.map((fieldPath) => ({ fieldPath })) },
        from: [{ collectionId }],
        orderBy: [{ field: { fieldPath: "order" }, direction: "ASCENDING" }],
      },
    }),
  });
  if (!response.ok) throw new Error(`관리자 목록을 불러오지 못했습니다. (${response.status})`);
  const rows = (await response.json()) as Array<{ document?: RestDocument }>;
  return rows.flatMap(({ document }) =>
    document
      ? [
          {
            id: document.name.split("/").pop() ?? "",
            data: decodeFields(document.fields ?? {}),
          },
        ]
      : [],
  );
};

const text = (value: unknown): LocalizedText => (value as LocalizedText) ?? { ko: "", en: "" };
const image = (value: unknown): ImageMeta =>
  (value as ImageMeta) ?? { url: "", path: "", w: 0, h: 0 };

const listPhotoItemsAdmin = async (): Promise<AdminPhotoListItem[]> =>
  (await listProjected("photos", ["title", "image", "order", "published"])).map(({ id, data }) => ({
    id,
    title: text(data.title),
    image: image(data.image),
    order: (data.order as number) ?? 0,
    published: (data.published as boolean) ?? false,
  }));

const listAlbumItemsAdmin = async (): Promise<AdminAlbumListItem[]> =>
  (
    await listProjected("albums", [
      "title",
      "coverPhotoId",
      "cover",
      "photoIds",
      "order",
      "published",
    ])
  ).map(({ id, data }) => ({
    id,
    title: text(data.title),
    coverPhotoId: (data.coverPhotoId as string) ?? "",
    cover: (data.cover as ImageMeta | null) ?? null,
    photoIds: (data.photoIds as string[]) ?? [],
    order: (data.order as number) ?? 0,
    published: (data.published as boolean) ?? false,
  }));

const listDevProjectItemsAdmin = async (): Promise<AdminDevProjectListItem[]> =>
  (await listProjected("devProjects", ["title", "year", "cover", "order", "published"])).map(
    ({ id, data }) => ({
      id,
      title: text(data.title),
      year: (data.year as string) ?? "",
      cover: (data.cover as ImageMeta | null) ?? null,
      order: (data.order as number) ?? 0,
      published: (data.published as boolean) ?? false,
    }),
  );

const listMusicWorkItemsAdmin = async (): Promise<AdminMusicWorkListItem[]> =>
  (await listProjected("musicWorks", ["title", "performedAt", "poster", "order", "published"])).map(
    ({ id, data }) => ({
      id,
      title: text(data.title),
      performedAt: new Date((data.performedAt as string) ?? 0),
      poster: image(data.poster),
      order: (data.order as number) ?? 0,
      published: (data.published as boolean) ?? false,
    }),
  );

export {
  listAlbumItemsAdmin,
  listDevProjectItemsAdmin,
  listMusicWorkItemsAdmin,
  listPhotoItemsAdmin,
};
