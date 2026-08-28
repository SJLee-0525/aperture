import {
  entryOf,
  formatArticleScreenContextBlock,
  lookupFreshEntry,
} from "@/features/chat/_lib/resolve-chat-screen-context";

import { matchDevArticleSlug } from "@/constants/routes";
import { stripLangPrefix } from "@/lib/i18n/locale-path";

import type { ProfileSnapshot } from "@/features/chat/_lib/build-profile-context";
import type { ChatContext, ChatContextOpenTarget } from "@/features/chat/_lib/chat-context";
import type { ProfileSection } from "@/features/chat/_lib/chat-intent";
import type { ScreenContextLookup } from "@/features/chat/_lib/resolve-chat-screen-context";
import type { DevArticle } from "@/types/dev-article";
import type { Lang } from "@/types/lang";
import type { RagExclude } from "@/types/rag";

/** 열린 상세 항목이 속한 프로필 섹션. */
const TARGET_PROFILE_SECTIONS: Record<ChatContextOpenTarget["type"], ProfileSection> = {
  photo: "photography",
  work: "music",
  award: "music",
  project: "development",
  article: "development",
};

/**
 * 화면 target 해석 결과. 프로필 섹션 선택, 화면 문맥, RAG 우선 검색이 같은 값을 쓴다.
 * `verified` 만이 공개 데이터에서 항목을 실제로 찾았다는 뜻이며, 조회를 유발하는 섹션 선택은
 * 이 플래그로만 열린다.
 */
type ResolvedChatTarget = {
  openTarget?: ChatContextOpenTarget;
  /** 공개 데이터에서 이 target 을 찾았는지 여부. */
  verified?: boolean;
  prioritize?: { sourceType: string; sourceId: string };
  /** 본문 전문이 화면 문맥에 실린 원본 — RAG 후보에서 빼 프롬프트 중복을 막는다. */
  exclude?: RagExclude;
  /** 검증에 읽은 문서로 만든 화면 문맥. 있으면 추가 조회 없이 그대로 쓴다. */
  screenContext?: string;
};

/**
 * 요청 화면 문맥을 해석해 세 소비처(섹션 선택·화면 문맥·RAG 우선 검색)가 함께 쓸 값으로 만든다.
 *
 * 글은 URL 의 slug 와 문서 ID 가 따로 오므로 서버가 문서 한 건을 읽어 두 값을 맞춰 본다.
 * live 에서는 캐시된 스냅샷으로 물러나지 않는다. 방금 발행을 취소한 글이 캐시에 남아 있으면
 * 되살아나기 때문이다. 조회 자체가 실패하면 글 target 과 우선 검색을 함께 버리고
 * 채팅은 그대로 이어 간다(글은 fail-closed, 채팅은 fail-open).
 * 검증에 읽은 문서로 화면 문맥까지 만들어 돌려준다. 같은 글을 두 번 읽지 않는다.
 *
 * 나머지 종류는 최신 공개 데이터의 화면 문맥 lookup 에 그 id 가 있는지로 확인한다.
 * 최신 조회에 성공했는데 없으면 더 이상 공개가 아니므로 target 을 버린다. 조회 자체가
 * 실패하거나 mock 이라 로더가 없을 때만 캐시된 스냅샷을 본다. `resolveScreenContext` 와
 * 같은 lookup 을 쓰므로 화면 문맥과 섹션 게이트가 다른 판정을 내지 않는다.
 * 확인되지 않은 target 은 `verified` 가 거짓이라 프로필 섹션을 열지 못한다.
 *
 * @param context 파싱을 마친 요청 문맥.
 * @param lang 화면 문맥을 표시할 언어.
 * @param loadArticle live 단건 로더. mock 이면 undefined.
 * @param getSnapshot 캐시된 스냅샷 로더.
 * @param signal 요청 취소 신호.
 * @returns 해석한 target, 확인 여부, 우선 검색 대상, 화면 문맥.
 */
const resolveContextTarget = async (
  context: ChatContext | undefined,
  lang: Lang,
  loadArticle: ((id: string, signal?: AbortSignal) => Promise<DevArticle | null>) | undefined,
  getSnapshot: () => Promise<ProfileSnapshot>,
  signal: AbortSignal,
  getFreshScreenLookup?: () => Promise<ScreenContextLookup>,
): Promise<ResolvedChatTarget> => {
  const openTarget = context?.openTarget;
  if (!openTarget) return {};

  if (openTarget.type !== "article") {
    const fresh = await lookupFreshEntry(openTarget, getFreshScreenLookup);
    // 최신 조회가 항목을 못 찾았다면 방금 비공개로 바뀐 것이다. 캐시로 되살리지 않는다.
    if (fresh.queried) return fresh.entry === undefined ? {} : { openTarget, verified: true };
    try {
      return {
        openTarget,
        verified: entryOf((await getSnapshot()).screenLookup, openTarget) !== undefined,
      };
    } catch {
      // 스냅샷을 읽지 못하면 이 항목이 공개인지 확인할 수 없다. 조회를 열지 않고 답변은 이어 간다.
      return { openTarget };
    }
  }

  const slug = matchDevArticleSlug(stripLangPrefix(context.pathname));
  if (!slug) return {};
  const resolved: ResolvedChatTarget = {
    openTarget,
    verified: true,
    prioritize: { sourceType: "article", sourceId: openTarget.id },
  };

  try {
    if (!loadArticle) {
      return (await getSnapshot()).articleSlugById[openTarget.id] === slug ? resolved : {};
    }
    const article = await loadArticle(openTarget.id, signal);
    // RLS 가 초안 read 를 거부하므로 여기 도달한 문서도 published 를 다시 확인한다.
    if (!article || !article.published || article.slug !== slug) return {};
    // 열어 둔 글은 본문 평문까지 문맥에 싣는다. 검증에 읽은 문서를 재사용한다.
    const block = formatArticleScreenContextBlock(article, lang);
    if (block.complete) {
      // 본문 전문이 문맥에 있으면 같은 글 청크는 중복이다. 우선 검색 대신 후보에서 뺀다.
      return {
        openTarget,
        verified: true,
        exclude: { sourceType: "article", sourceId: openTarget.id },
        screenContext: block.text,
      };
    }
    // 잘린 본문은 꼬리를 청크가 보완하도록 우선 검색을 유지한다.
    return { ...resolved, screenContext: block.text };
  } catch {
    // 조회가 막히면 이 글이 아직 공개인지 확인할 수 없다. 문맥 없이 답한다.
    return {};
  }
};

export { resolveContextTarget, TARGET_PROFILE_SECTIONS };
export type { ResolvedChatTarget };
