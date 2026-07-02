import { COLLECTIONS, SITE_DOC } from "@/constants/collections";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import type { Album } from "@/types/album";
import type { Coords } from "@/types/coords";
import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";
import type { Photo } from "@/types/photo";
import type { SiteConfig, SiteLink } from "@/types/site";
import type { Tag } from "@/types/tag";

/**
 * 공개 페이지 서버 읽기 = Firestore REST API + fetch (아키텍처 원칙 #6).
 * 클라 SDK 를 서버 렌더(ISR)에서 쓰면 stale/실패 → 재생성 폐기 위험이 있어, 공개 read 는
 * `fetch` 기반 REST 로만 한다(ISR·revalidatePath 정상 연동). 쓰기·관리자 읽기는 클라 SDK(firestore.ts).
 *
 * published 문서·site 는 Rules 가 무인증 read 를 허용 → 웹 API 키만으로 충분.
 * published==true + orderBy(order) 쿼리는 firestore.indexes.json 의 복합 인덱스가 필요하다.
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

/** ISR 캐시 힌트 — 페이지 segment 의 revalidate 와 함께 무료 한도(읽기 5만/일)를 지킨다. */
const REVALIDATE_SECONDS = 3600;

const documentsUrl = () =>
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/** Firestore REST 값 1개(형식 태그 wrapper) → JS 값. */
type RestValue = Record<string, unknown>;
type RestDocument = { name: string; fields?: Record<string, RestValue> };

const decodeValue = (value: RestValue | undefined): unknown => {
  if (!value) return null;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue as string;
  if ("booleanValue" in value) return value.booleanValue as boolean;
  if ("integerValue" in value) return Number(value.integerValue); // REST 는 정수를 문자열로 준다
  if ("doubleValue" in value) return value.doubleValue as number;
  if ("timestampValue" in value) return value.timestampValue as string; // RFC3339 문자열
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

/** 문서 리소스 경로(.../documents/photos/abc) → 문서 ID(abc). */
const docId = (name: string): string => name.split("/").pop() ?? "";

const toDate = (value: unknown): Date => {
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return new Date(0);
};

/** published==true + orderBy(order) 구조화 쿼리 — photos·albums 공용. */
const publishedOrderedQuery = (collectionId: string) => ({
  from: [{ collectionId }],
  where: {
    fieldFilter: {
      field: { fieldPath: "published" },
      op: "EQUAL",
      value: { booleanValue: true },
    },
  },
  orderBy: [{ field: { fieldPath: "order" }, direction: "ASCENDING" }],
});

/** :runQuery — 결과가 없으면 document 없는 row 만 오므로 필터한다. */
const runQuery = async (
  structuredQuery: Record<string, unknown>,
): Promise<Array<{ id: string; data: Record<string, unknown> }>> => {
  // POST 는 Next fetch 캐시 대상이 아니지만, 페이지 segment 의 revalidate 가 ISR 을 담당한다.
  const res = await fetch(`${documentsUrl()}:runQuery?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery }),
  });
  if (!res.ok) throw new Error(`Firestore runQuery 실패 (${res.status})`);

  const rows = (await res.json()) as Array<{ document?: RestDocument }>;
  return rows
    .filter((row): row is { document: RestDocument } => Boolean(row.document))
    .map((row) => ({ id: docId(row.document.name), data: decodeFields(row.document.fields ?? {}) }));
};

// ── REST 디코딩 값 → 도메인 타입 매핑 (누락 필드는 안전 기본값) ──────────────

const EMPTY_EXIF: Photo["exif"] = {
  aperture: "",
  shutter: "",
  iso: "",
  focalLength: "",
  ev: "",
  wb: "",
  metering: "",
  flash: "",
};

const restToPhoto = (id: string, d: Record<string, unknown>): Photo => ({
  id,
  title: (d.title as LocalizedText) ?? { ko: "", en: "" },
  shotAt: toDate(d.shotAt),
  camera: (d.camera as string) ?? "",
  lens: (d.lens as string) ?? "",
  exif: { ...EMPTY_EXIF, ...((d.exif as Partial<Photo["exif"]>) ?? {}) },
  fileName: (d.fileName as string) ?? undefined,
  dimensions: (d.dimensions as { w: number; h: number }) ?? { w: 0, h: 0 },
  aspectRatio: (d.aspectRatio as number) ?? 1,
  place: (d.place as LocalizedText) ?? { ko: "", en: "" },
  coords: (d.coords as Coords | null) ?? null,
  tags: (d.tags as string[]) ?? [],
  image: d.image as ImageMeta,
  likes: (d.likes as number) ?? 0,
  order: (d.order as number) ?? 0,
  published: (d.published as boolean) ?? false,
});

const restToAlbum = (id: string, d: Record<string, unknown>): Album => ({
  id,
  title: (d.title as LocalizedText) ?? { ko: "", en: "" },
  subtitle: (d.subtitle as LocalizedText) ?? { ko: "", en: "" },
  coverPhotoId: (d.coverPhotoId as string) ?? "",
  photoIds: (d.photoIds as string[]) ?? [],
  order: (d.order as number) ?? 0,
  published: (d.published as boolean) ?? false,
});

const restToSite = (d: Record<string, unknown>): SiteConfig => ({
  name: (d.name as LocalizedText) ?? { ko: "", en: "" },
  bio: (d.bio as LocalizedText) ?? { ko: "", en: "" },
  links: (d.links as SiteLink[]) ?? [],
  tags: (d.tags as Tag[]) ?? [],
});

// ── 공개 read API (도메인 타입 반환) ────────────────────────────────────────

/** 공개 사진 — published==true, order 순. */
const fetchPublishedPhotos = async (): Promise<Photo[]> => {
  const rows = await runQuery(publishedOrderedQuery(COLLECTIONS.PHOTOS));
  return rows.map((row) => restToPhoto(row.id, row.data));
};

/** 공개 앨범 — published==true, order 순. */
const fetchPublishedAlbums = async (): Promise<Album[]> => {
  const rows = await runQuery(publishedOrderedQuery(COLLECTIONS.ALBUMS));
  return rows.map((row) => restToAlbum(row.id, row.data));
};

/** site/config 단일 문서(read: if true). 문서가 없으면 null → 호출부가 mock 폴백. */
const fetchSiteConfig = async (): Promise<SiteConfig | null> => {
  const res = await fetch(`${documentsUrl()}/${COLLECTIONS.SITE}/${SITE_DOC}?key=${API_KEY}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore site 읽기 실패 (${res.status})`);

  const doc = (await res.json()) as RestDocument;
  return restToSite(decodeFields(doc.fields ?? {}));
};

export { fetchPublishedAlbums, fetchPublishedPhotos, fetchSiteConfig, isFirebaseConfigured };
