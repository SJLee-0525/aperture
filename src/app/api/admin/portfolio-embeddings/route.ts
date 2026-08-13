import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { CHAT_PROFILE_CACHE_TAG } from "@/constants/cache";
import { COLLECTIONS } from "@/constants/collections";
import { embeddingModelKey, generateEmbeddings } from "@/lib/ai/embedding";
import { buildRagChunks } from "@/lib/ai/rag-chunks";
import { verifyAdminIdToken } from "@/lib/auth/verify-admin-id-token";
import { getRagSourceData, getRagSourceDataForTarget } from "@/lib/content/rag-source";

import type { RagChunk, RagSyncTarget } from "@/types/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

const firebaseConfig = () => {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) throw new Error("Firebase 설정이 필요합니다.");
  return { apiKey, database: `projects/${projectId}/databases/(default)` };
};

type ExistingDocument = Pick<RagChunk, "sourceType" | "sourceId"> & {
  embeddingModel: string;
  name: string;
};

const ALLOWED_SOURCE_TYPES = new Set([
  "photo",
  "album",
  "project",
  "musicWork",
  "musicAward",
  "musicMedia",
  "siteConfig",
  "devConfig",
  "musicConfig",
  "photoTags",
]);

const stringField = (value: unknown) =>
  typeof value === "object" && value !== null && "stringValue" in value
    ? String((value as { stringValue: unknown }).stringValue)
    : "";

const listExistingDocuments = async (
  idToken: string,
  target?: RagSyncTarget,
): Promise<ExistingDocument[]> => {
  const { apiKey, database } = firebaseConfig();
  const projectedFields = ["sourceType", "sourceId", "embeddingModel"];
  const fieldPath = target?.sourceType === "photoTags" ? "sourceType" : "sourceId";
  const value =
    target?.sourceType === "photoTags"
      ? "photo"
      : target?.sourceType === "siteConfig"
        ? "site"
        : target?.sourceId;
  let documents: Array<{ name?: string; fields?: Record<string, unknown> }> = [];
  if (target) {
    const response = await fetch(
      `https://firestore.googleapis.com/v1/${database}/documents:runQuery?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: COLLECTIONS.RAG_DOCUMENTS }],
            select: { fields: projectedFields.map((fieldPath) => ({ fieldPath })) },
            where: {
              fieldFilter: { field: { fieldPath }, op: "EQUAL", value: { stringValue: value } },
            },
          },
        }),
        cache: "no-store",
      },
    );
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`기존 임베딩 조회 실패 (${response.status})`);
    const rows = (await response.json()) as Array<{
      document?: { name?: string; fields?: Record<string, unknown> };
    }>;
    documents = rows.flatMap(({ document }) => (document ? [document] : []));
  } else {
    let pageToken = "";
    do {
      const query = new URLSearchParams({ key: apiKey, pageSize: "1000" });
      projectedFields.forEach((field) => query.append("mask.fieldPaths", field));
      if (pageToken) query.set("pageToken", pageToken);
      const response = await fetch(
        `https://firestore.googleapis.com/v1/${database}/documents/${COLLECTIONS.RAG_DOCUMENTS}?${query}`,
        { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" },
      );
      if (response.status === 404) return [];
      if (!response.ok) throw new Error(`기존 임베딩 조회 실패 (${response.status})`);
      const page = (await response.json()) as {
        documents?: Array<{ name?: string; fields?: Record<string, unknown> }>;
        nextPageToken?: string;
      };
      documents.push(...(page.documents ?? []));
      pageToken = page.nextPageToken ?? "";
    } while (pageToken);
  }
  return documents.flatMap(({ name, fields }) =>
    name
      ? [
          {
            name,
            sourceType: stringField(fields?.sourceType),
            sourceId: stringField(fields?.sourceId),
            embeddingModel: stringField(fields?.embeddingModel),
          },
        ]
      : [],
  );
};

const fieldsFor = (chunk: RagChunk, embedding: number[], model: string) => ({
  section: { stringValue: chunk.section },
  sourceType: { stringValue: chunk.sourceType },
  sourceId: { stringValue: chunk.sourceId },
  chunkKey: { stringValue: chunk.chunkKey },
  text: { stringValue: chunk.text },
  embedding: { arrayValue: { values: embedding.map((value) => ({ doubleValue: value })) } },
  embeddingModel: { stringValue: model },
  published: { booleanValue: true },
});

type FirestoreWrite = { delete: string } | { update: { name: string; fields: object } };
const MAX_COMMIT_WRITES = 200;
const MAX_COMMIT_BYTES = 7_500_000;

const splitWrites = (writes: FirestoreWrite[]): FirestoreWrite[][] => {
  const batches: FirestoreWrite[][] = [];
  let batch: FirestoreWrite[] = [];
  let bytes = 13;
  for (const write of writes) {
    const writeBytes = new TextEncoder().encode(JSON.stringify(write)).length + 1;
    if (
      batch.length > 0 &&
      (batch.length >= MAX_COMMIT_WRITES || bytes + writeBytes > MAX_COMMIT_BYTES)
    ) {
      batches.push(batch);
      batch = [];
      bytes = 13;
    }
    batch.push(write);
    bytes += writeBytes;
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
};

/**
 * 업스트림 원문은 서버 로그에만 남긴다 — 응답 본문에 실으면 내부 경로·필드명이 그대로 나간다.
 * 관리자 전용 라우트지만 진단 정보를 응답으로 흘릴 이유는 없다.
 *
 * @param {Response} response
 * @returns {Promise<void>}
 */
const logFirestoreError = async (response: Response) => {
  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  if (payload?.error?.message) {
    console.error(`[portfolio-embeddings] Firestore ${response.status}: ${payload.error.message}`);
  }
};

const replaceRagDocuments = async (
  idToken: string,
  chunks: RagChunk[],
  vectors: number[][],
  model: string,
  target?: RagSyncTarget,
) => {
  const { apiKey, database } = firebaseConfig();
  const existing = await listExistingDocuments(idToken, target);
  const nextNames = new Set(
    chunks.map(({ id }) => `${database}/documents/${COLLECTIONS.RAG_DOCUMENTS}/${id}`),
  );
  const storedTypes = target
    ? target.sourceType === "siteConfig"
      ? new Set(["profile"])
      : target.sourceType === "devConfig"
        ? new Set(["devConfig", "devCareer", "devEducation", "devAward"])
        : target.sourceType === "musicConfig"
          ? new Set(["musicConfig", "musicCareer", "musicEducation"])
          : target.sourceType === "photoTags"
            ? new Set(["photo"])
            : new Set([target.sourceType])
    : null;
  const scopedExisting = storedTypes
    ? existing.filter(({ sourceType }) => storedTypes.has(sourceType))
    : existing;
  const stale = scopedExisting.map(({ name }) => name).filter((name) => !nextNames.has(name));
  if (stale.length + chunks.length > 1_000) {
    throw new Error("RAG 문서가 1,000개를 초과해 한 번에 갱신할 수 없습니다.");
  }
  const writes = [
    ...stale.map((name) => ({ delete: name })),
    ...chunks.map((chunk, index) => ({
      update: {
        name: `${database}/documents/${COLLECTIONS.RAG_DOCUMENTS}/${chunk.id}`,
        fields: fieldsFor(chunk, vectors[index] ?? [], model),
      },
    })),
  ];
  for (const batch of splitWrites(writes)) {
    const response = await fetch(
      `https://firestore.googleapis.com/v1/${database}/documents:commit?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ writes: batch }),
        cache: "no-store",
      },
    );
    if (!response.ok) {
      await logFirestoreError(response);
      throw new Error(`Firestore 임베딩 저장 실패 (${response.status})`);
    }
  }
};

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!(await verifyAdminIdToken(idToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const payload = (await request.json().catch(() => null)) as {
      target?: RagSyncTarget;
    } | null;
    const target = payload?.target;
    if (
      target &&
      (!ALLOWED_SOURCE_TYPES.has(target.sourceType) ||
        typeof target.sourceId !== "string" ||
        !target.sourceId.trim())
    ) {
      return NextResponse.json({ error: "지원하지 않는 RAG 갱신 대상입니다." }, { status: 400 });
    }
    const allChunks = buildRagChunks(
      target ? await getRagSourceDataForTarget(target, idToken) : await getRagSourceData(),
    );
    const chunks = target
      ? allChunks.filter((chunk) => {
          if (target.sourceType === "photoTags") return chunk.sourceType === "photo";
          if (target.sourceType === "siteConfig") return chunk.sourceId === "site";
          if (target.sourceType === "devConfig")
            return chunk.sourceId === "dev" && chunk.section === "development";
          if (target.sourceType === "musicConfig") return chunk.sourceId === "music";
          return chunk.sourceType === target.sourceType && chunk.sourceId === target.sourceId;
        })
      : allChunks;
    const model = embeddingModelKey();
    const vectors = await generateEmbeddings(
      chunks.map(({ text }) => text),
      { signal: request.signal },
    );
    await replaceRagDocuments(idToken, chunks, vectors, model, target);
    revalidateTag(CHAT_PROFILE_CACHE_TAG, "max");
    return NextResponse.json({
      count: chunks.length,
      dimensions: vectors[0]?.length ?? 0,
      model,
      mode: target ? "incremental" : "full",
      sections: Object.fromEntries(
        ["profile", "development", "music", "photography"].map((section) => [
          section,
          chunks.filter((item) => item.section === section).length,
        ]),
      ),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "임베딩 생성에 실패했습니다." },
      { status: 502 },
    );
  }
}

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!(await verifyAdminIdToken(idToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const chunks = buildRagChunks(await getRagSourceData());
    const existing = await listExistingDocuments(idToken);
    const { database } = firebaseConfig();
    const model = embeddingModelKey();
    const expectedNames = new Set(
      chunks.map(({ id }) => `${database}/documents/${COLLECTIONS.RAG_DOCUMENTS}/${id}`),
    );
    const ready = existing.filter(
      ({ name, embeddingModel }) => expectedNames.has(name) && embeddingModel === model,
    ).length;
    const stale = existing.filter(({ name }) => !expectedNames.has(name)).length;
    const total = chunks.length;
    return NextResponse.json({
      completed: ready,
      model,
      outdated: existing.filter(
        ({ name, embeddingModel }) => expectedNames.has(name) && embeddingModel !== model,
      ).length,
      pending: Math.max(0, total - ready),
      percent: total === 0 ? 100 : Math.round((ready / total) * 100),
      stale,
      total,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "임베딩 상태 확인에 실패했습니다." },
      { status: 502 },
    );
  }
}
