import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { articleRagChunks } from "@/features/dev-blog/_lib/article-rag-chunks";
import { articleTagTokens } from "@/features/dev-blog/_lib/article-tag-tokens";

import { CHAT_PROFILE_CACHE_TAG } from "@/constants/cache";
import { embeddingModelKey, generateEmbeddings } from "@/lib/ai/embedding";
import { buildRagChunks } from "@/lib/ai/rag-chunks";
import { verifyAdminIdToken } from "@/lib/auth/verify-admin-id-token";
import { getRagSourceData, getRagSourceDataForTarget } from "@/lib/content/rag-source";
import { listRagDocumentMeta, replaceRagDocuments } from "@/lib/supabase/rag";

import type { RagSourceData } from "@/lib/content/rag-source";
import type { RagChunk, RagSyncTarget } from "@/types/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  "article",
]);

/**
 * 전 섹션 청크와 블로그 글 청크를 합친다.
 *
 * 블로그 청크 빌더는 Markdown 파서를 쓰므로 feature 안에 있고 `lib/ai/rag-chunks` 는 그쪽을
 * import 하지 않는다. 두 결과를 잇는 지점이 여기 하나여야 전체 생성과 상태 조회가 같은 집합을 본다.
 *
 * @param {RagSourceData} data 조회를 마친 공개 원본.
 * @returns {RagChunk[]} 임베딩 대상 전체 청크.
 */
const buildAllRagChunks = (data: RagSourceData): RagChunk[] => [
  ...buildRagChunks(data),
  ...data.devArticles.flatMap((article) =>
    articleRagChunks(
      article,
      articleTagTokens(article.tags, data.devArticleTags, { includeId: true }),
    ),
  ),
];

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
    const allChunks = buildAllRagChunks(
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
    // 프로필 스냅샷 캐시 무효화. maintenance 의 전체 재생성이 콘텐츠 반영을 보는 유일한 서버측 경로다.
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
    const chunks = buildAllRagChunks(await getRagSourceData());
    const existing = await listRagDocumentMeta(idToken);
    const model = embeddingModelKey();
    const expectedIds = new Set(chunks.map(({ id }) => id));
    const ready = existing.filter(
      ({ id, embeddingModel }) => expectedIds.has(id) && embeddingModel === model,
    ).length;
    const stale = existing.filter(({ id }) => !expectedIds.has(id)).length;
    const total = chunks.length;
    return NextResponse.json({
      completed: ready,
      model,
      outdated: existing.filter(
        ({ id, embeddingModel }) => expectedIds.has(id) && embeddingModel !== model,
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
