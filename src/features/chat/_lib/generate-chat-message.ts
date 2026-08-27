import { buildChatInstructions } from "@/features/chat/_lib/chat-prompt";
import { resolveScreenContext } from "@/features/chat/_lib/resolve-chat-screen-context";
import {
  resolveContextTarget,
  TARGET_PROFILE_SECTIONS,
  type ResolvedChatTarget,
} from "@/features/chat/_lib/resolve-chat-target";
import { isPhotoQueryRoute, parseInternalHref, sanitizeLinks } from "@/features/chat/_lib/sanitize-chat-links";

import type { ProfileSnapshot } from "@/features/chat/_lib/build-profile-context";
import type { ChatContext } from "@/features/chat/_lib/chat-context";
import type { ChatIntent, ProfileSection } from "@/features/chat/_lib/chat-intent";
import type { ChatProvider } from "@/features/chat/_lib/chat-provider";
import type { ChatRequestMessage } from "@/features/chat/_lib/chat-schema";
import type { ScreenContextLookup } from "@/features/chat/_lib/resolve-chat-screen-context";
import type { ChatProfileData } from "@/lib/content/chat";
import type { ChatReference, ChatReferenceRequest } from "@/types/chat";
import type { DevArticle } from "@/types/dev-article";
import type { Lang } from "@/types/lang";
import type { RagExclude, RagPrioritize, RagQuery } from "@/types/rag";

/** 문맥 조회를 하지 않은 턴에 프롬프트가 받는 자리표시자. */
const NO_LOOKUP_PROFILE_CONTEXT =
  "# PROFILE_CONTEXT\nNo portfolio lookup was needed for this conversational turn.";

type GenerateChatMessageOptions = {
  lang: Lang;
  messages: ChatRequestMessage[];
  context: ChatContext | undefined;
  intent: ChatIntent;
  ragQuery: RagQuery;
  /** 하루 입력 문자 예산을 넘긴 상태. 문서 조회와 벡터 검색을 모두 건너뛴다. */
  contextBudgetSpent: boolean;
  /** 질문이 스스로 섹션을 고르지 않아 열어 둔 항목으로 섹션을 열 수 있는 상태. */
  canUseOpenTarget: boolean;
  signal: AbortSignal;
  provider: ChatProvider;
  getSnapshot: () => Promise<ProfileSnapshot>;
  getFreshData?: () => Promise<ChatProfileData>;
  getFreshScreenLookup?: () => Promise<ScreenContextLookup>;
  getArticle?: (id: string, signal?: AbortSignal) => Promise<DevArticle | null>;
  buildContext: (
    getSnapshot: () => Promise<ProfileSnapshot>,
    sections?: ProfileSection[],
    query?: RagQuery,
    signal?: AbortSignal,
    prioritize?: RagPrioritize,
    exclude?: RagExclude,
  ) => Promise<string>;
  resolveReferences: (
    requested: ChatReferenceRequest[],
    cachedReferences: ChatReference[],
    loadFreshReferences?: () => Promise<ChatReference[]>,
  ) => Promise<ChatReference[]>;
  formatFreshReferences: ((data: ChatProfileData, lang: Lang) => ChatReference[]) | undefined;
  recordTokenUsage: (chars: number) => Promise<void>;
  onContentDelta?: (delta: string) => void;
};

/** 어떤 프로필 섹션을 문맥으로 실을지 정한다. */
const selectProfileSections = (
  resolved: ResolvedChatTarget,
  { intent, canUseOpenTarget, contextBudgetSpent }: GenerateChatMessageOptions,
): { sections: ProfileSection[]; openTargetSection: ProfileSection | null } => {
  if (contextBudgetSpent) return { sections: [], openTargetSection: null };

  // 공개 데이터에서 찾은 target 만 섹션을 연다. 없는 id 로 조회를 유발할 수 없다.
  const openTargetSection =
    canUseOpenTarget && resolved.verified && resolved.openTarget
      ? TARGET_PROFILE_SECTIONS[resolved.openTarget.type]
      : null;

  // `profile` 은 섹션이 하나라도 잡히면 늘 함께 본다(`chat-intent` 의 `sectionsForText` 규약).
  return {
    sections: openTargetSection ? ["profile", openTargetSection] : intent.sections,
    openTargetSection,
  };
};

/**
 * 참조 카드를 만든다. 조회가 실패하면 완성된 답변은 유지하고 카드만 생략한다.
 */
const resolveMessageReferences = async (
  requested: ChatReferenceRequest[],
  options: GenerateChatMessageOptions,
): Promise<ChatReference[] | undefined> => {
  const { getSnapshot, getFreshData, resolveReferences, formatFreshReferences, lang } = options;
  try {
    return await resolveReferences(
      requested,
      (await getSnapshot()).references,
      getFreshData && formatFreshReferences
        ? async () => formatFreshReferences(await getFreshData(), lang)
        : undefined,
    );
  } catch (error) {
    console.warn("[chat] reference resolution failed; sending answer without references:", error);
    return undefined;
  }
};

/**
 * 문맥을 모아 provider 를 부르고 답변 한 통을 만든다.
 *
 * 화면 target 해석은 섹션 선택, 화면 문맥, RAG 우선 검색 앞의 공통 단계다. 세 곳이 각자
 * 판단하면 확인되지 않은 target 이 한쪽으로 샌다.
 */
const generateChatMessage = async (options: GenerateChatMessageOptions) => {
  const {
    lang,
    messages,
    context,
    ragQuery,
    contextBudgetSpent,
    signal,
    provider,
    getSnapshot,
    getFreshScreenLookup,
    getArticle,
    buildContext,
    recordTokenUsage,
    onContentDelta,
  } = options;

  // 입력 예산을 넘겼으면 해석 자체를 건너뛴다. 문서 조회와 벡터 검색이 모두 빠진다.
  const resolved: ResolvedChatTarget = contextBudgetSpent
    ? {}
    : await resolveContextTarget(
        context,
        lang,
        getArticle,
        getSnapshot,
        signal,
        getFreshScreenLookup,
      );
  const { sections, openTargetSection } = selectProfileSections(resolved, options);
  // 질문이 스스로 섹션을 고른 경우에는 열어 둔 원본도 최소 점수를 넘어야 자리를 차지한다.
  const prioritize: RagPrioritize | undefined = resolved.prioritize
    ? { ...resolved.prioritize, ignoreScoreFloor: openTargetSection !== null }
    : undefined;

  const [profileContext, screenContext] = await Promise.all([
    sections.length > 0
      ? buildContext(getSnapshot, sections, ragQuery, signal, prioritize, resolved.exclude)
      : Promise.resolve(NO_LOOKUP_PROFILE_CONTEXT),
    // 화면 문맥 조회에 실패해도 답변은 계속하며 원문과 오류는 기록하지 않는다.
    resolved.screenContext !== undefined
      ? Promise.resolve(resolved.screenContext)
      : resolveScreenContext(resolved.openTarget, {
          getScreenLookup: async () => (await getSnapshot()).screenLookup,
          getFreshScreenLookup,
        }).catch(() => undefined),
  ]);

  const instructions = buildChatInstructions(lang, profileContext, screenContext);
  const messageChars = messages.reduce((total, { content }) => total + content.length, 0);
  // 프롬프트 크기 계측 — 화면 본문·RAG 청크 예산 조정의 기준선 (checklist 08 M6 후속).
  console.info(
    `[chat-input] instructions=${instructions.length} profile=${profileContext.length} screen=${screenContext?.length ?? 0} messages=${messageChars}`,
  );
  // 입력 비용은 호출 시점에 확정되므로 응답을 기다리지 않고 먼저 적는다. 성공 후에 적으면
  // 타임아웃된 요청의 입력이 예산에서 빠진다. 기본 구현은 실패를 안에서 처리하지만,
  // 주입된 구현까지 그렇다는 보장이 없어 여기서도 받아 둔다.
  void recordTokenUsage(instructions.length + messageChars).catch(() => undefined);

  const result = await provider({ instructions, messages, lang, signal, onContentDelta });
  const content = result.content.trim();
  if (!content) throw new Error("Provider returned an empty response");

  const references = result.references?.length
    ? await resolveMessageReferences(result.references, options)
    : undefined;

  // 사진 query 링크가 있을 때만 어휘를 기다린다. 로드에 실패하면 해당 링크를 버린다.
  const hasPhotoQueryLink = result.links?.some((link) => {
    const parsed = parseInternalHref(link.href);
    return parsed ? isPhotoQueryRoute(parsed) : false;
  });
  const photoVocabulary = hasPhotoQueryLink
    ? await getSnapshot()
        .then((snapshot) => snapshot.linkVocabulary)
        .catch(() => undefined)
    : undefined;

  return {
    role: "assistant" as const,
    content,
    links: sanitizeLinks(result.links, references, photoVocabulary),
    references: references?.length ? references : undefined,
    // 스트리밍 응답의 contactDraft는 done 이벤트에만 포함한다.
    ...(result.contactDraft ? { contactDraft: result.contactDraft } : {}),
  };
};

export { generateChatMessage };
export type { GenerateChatMessageOptions };
