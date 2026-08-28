"use client";

import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useMemo, useState } from "react";

import { useUnsavedForm } from "@/features/admin-shell/_hooks/use-unsaved-form";

import {
  articleToInput,
  emptyArticleInput,
  prepareArticleInput,
} from "@/features/admin-dev-articles/_lib/dev-article-form";
import { checkArticlePublishable } from "@/features/admin-dev-articles/_lib/dev-article-publish-check";
import {
  getDevArticleRepository,
  type DevArticleInput,
} from "@/features/admin-dev-articles/_lib/dev-article-repository";
import { suggestArticleSlug } from "@/features/admin-dev-articles/_lib/dev-article-slug";
import { clearNewArticleId } from "@/features/admin-dev-articles/_lib/new-article-id";
import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";

import { adminDevArticleRoute } from "@/constants/routes";
import { formFingerprint } from "@/lib/admin/form-fingerprint";

import type { useArticleReferences } from "@/features/admin-dev-articles/_hooks/use-article-references";
import type { DevArticle } from "@/types/dev-article";

type References = ReturnType<typeof useArticleReferences>;

/**
 * 폼 값의 지문. 저장 이후 바뀐 것이 있는지 비교하는 데만 쓴다.
 *
 * @param input 비교할 폼 값.
 * @returns 직렬화한 값.
 */
/**
 * 글 편집 폼의 상태와 저장.
 *
 * slug 는 관리자가 직접 고치기 전까지 제목을 따라간다. 한 번 고치면 그 뒤로는 제목이 바뀌어도
 * 건드리지 않는다 — 주소를 정해 둔 뒤 제목만 다듬는 것이 흔한 순서다. 이미 발행한 글
 * (`firstPublishedAt`)이면 아예 잠근다(07-dev-blog §2).
 *
 * 발행 조건은 저장 직전이 아니라 입력하는 동안 계속 계산한다. 발행 버튼 옆에 무엇이 모자란지
 * 보여 주려면 값이 항상 있어야 하고, 저장 함수도 같은 결과를 다시 확인한다.
 *
 * @param articleId 새 글이면 미리 발급한 ID, 편집이면 기존 문서 ID.
 * @param references 태그·프로젝트·다른 글 주소.
 * @param [initial] 편집 중인 글의 저장본. 새 글이면 없다.
 */
const useArticleEditor = (articleId: string, references: References, initial?: DevArticle) => {
  const router = useRouter();
  const repository = useMemo(() => getDevArticleRepository(), []);
  const isEdit = initial != null;

  const [form, setForm] = useState<DevArticleInput>(() =>
    initial ? articleToInput(initial) : emptyArticleInput(),
  );
  const [slugTouched, setSlugTouched] = useState(() => Boolean(initial?.slug));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 마지막으로 저장한 값의 지문. ref 가 아니라 state 다 — `dirty` 를 렌더 중 파생값으로
  // 계산하려면 이 값이 바뀔 때 다시 렌더돼야 한다.
  const [savedFingerprint, setSavedFingerprint] = useState(() =>
    formFingerprint(initial ? articleToInput(initial) : emptyArticleInput()),
  );

  const slugLocked = Boolean(initial?.firstPublishedAt);

  const applyForm = useCallback((next: DevArticleInput) => setForm(next), []);

  const patch = useCallback(
    (next: Partial<DevArticleInput>) =>
      setForm((previous) => {
        const merged = { ...previous, ...next };
        // 관리자가 주소를 아직 건드리지 않았으면 제목을 따라간다.
        return next.title && !slugTouched && !slugLocked
          ? { ...merged, slug: suggestArticleSlug(merged.title) }
          : merged;
      }),
    [slugLocked, slugTouched],
  );

  // 저장 여부는 상태가 아니라 두 값의 차이다. updater 안에서 setDirty 를 부르면 렌더 도중
  // 다른 상태를 갱신하게 되고, 복구본 적용·저장처럼 두 값이 함께 움직이는 경로에서 어긋난다.
  const dirty = useMemo(
    () => formFingerprint(form) !== savedFingerprint,
    [form, savedFingerprint],
  );
  // 열한 개 폼과 같은 가드에 등록한다. 등록하지 않으면 셸 헤더의 워드마크·사이트 보기·
  // 로그아웃이 편집 중에도 경고 없이 이동한다.
  const confirmLeave = useUnsavedForm(dirty);

  const onSlugChange = useCallback(
    (value: string) => {
      setSlugTouched(true);
      patch({ slug: value });
    },
    [patch],
  );

  // 본문이 바뀔 때만 다시 파싱한다. 발행 조건과 편집기 오류 목록이 같은 결과를 본다.
  // 파싱은 본문 길이에 비례해 무거우므로 입력을 막지 않게 한 박자 늦춘다 — 잠깐 이전 결과가
  // 보일 수 있지만, 발행 저장은 저장소가 같은 검사를 다시 하므로 어긋난 채 저장되지 않는다.
  const deferredBody = useDeferredValue(form.body);
  const markdownIssues = useMemo(() => parseArticleMarkdown(deferredBody).issues, [deferredBody]);

  const publishIssues = useMemo(
    () =>
      checkArticlePublishable(prepareArticleInput(form, initial), {
        articles: references.articles,
        selfId: articleId,
        markdownIssues,
        knownTagIds: references.tags.map((tag) => tag.id),
        publishableProjectIds: references.projects
          .filter((project) => project.published)
          .map((project) => project.id),
      }),
    [form, initial, references, articleId, markdownIssues],
  );

  const markSaved = useCallback((input: DevArticleInput) => {
    setSavedFingerprint(formFingerprint(input));
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (saving) return false;
    setError(null);

    const input = prepareArticleInput(form, initial);
    if (input.published && publishIssues.length > 0) {
      setError("발행 조건을 만족하지 않아 저장하지 않았습니다. 아래 목록을 확인하세요.");
      return false;
    }

    setSaving(true);
    try {
      if (isEdit) await repository.update(articleId, input);
      else await repository.create(articleId, input);

      applyForm(input);
      markSaved(input);
      setSavedAt(new Date());
      // 새 글은 저장과 함께 편집 주소로 옮긴다. 다시 저장하면 같은 문서를 고쳐야 한다.
      // 문서가 실제로 생겼으므로 탭에 저장해 둔 "저장 전 새 글 ID"도 지운다.
      if (!isEdit) {
        clearNewArticleId(window.sessionStorage);
        router.replace(adminDevArticleRoute(articleId));
      }
      return true;
    } catch (caught) {
      setError((caught as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    applyForm,
    articleId,
    form,
    initial,
    isEdit,
    markSaved,
    publishIssues,
    repository,
    router,
    saving,
  ]);

  return {
    form,
    applyForm,
    patch,
    isEdit,
    slugLocked,
    onSlugChange,
    markdownIssues,
    publishIssues,
    dirty,
    confirmLeave,
    saving,
    savedAt,
    error,
    save,
    markSaved,
  };
};

export { useArticleEditor };
