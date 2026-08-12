"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import { adminDevArticleRoute, ROUTES } from "@/constants/routes";

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

import type { DevArticle } from "@/types/dev-article";

import type { useArticleReferences } from "@/features/admin-dev-articles/_hooks/use-article-references";

type References = ReturnType<typeof useArticleReferences>;

/**
 * 폼 값의 지문. 저장 이후 바뀐 것이 있는지 비교하는 데만 쓴다.
 *
 * @param {DevArticleInput} input 비교할 폼 값.
 * @returns {string} 직렬화한 값.
 */
const fingerprint = (input: DevArticleInput): string => JSON.stringify(input);

/**
 * 글 편집 폼의 상태와 저장.
 *
 * slug 는 관리자가 직접 고치기 전까지 제목을 따라간다. 한 번 고치면 그 뒤로는 제목이 바뀌어도
 * 건드리지 않는다 — 주소를 정해 둔 뒤 제목만 다듬는 것이 흔한 순서다. 이미 발행한 글
 * (`firstPublishedAt`)이면 아예 잠근다(계획 §2).
 *
 * 발행 조건은 저장 직전이 아니라 입력하는 동안 계속 계산한다. 발행 버튼 옆에 무엇이 모자란지
 * 보여 주려면 값이 항상 있어야 하고, 저장 함수도 같은 결과를 다시 확인한다.
 *
 * @param {string} articleId 새 글이면 미리 발급한 ID, 편집이면 기존 문서 ID.
 * @param {References} references 태그·프로젝트·다른 글 주소.
 * @param {DevArticle} [initial] 편집 중인 글의 저장본. 새 글이면 없다.
 * @returns {{ form: DevArticleInput; patch: (next: Partial<DevArticleInput>) => void; isEdit: boolean; slugLocked: boolean; onSlugChange: (value: string) => void; markdownIssues: ReturnType<typeof parseArticleMarkdown>["issues"]; publishIssues: ReturnType<typeof checkArticlePublishable>; dirty: boolean; saving: boolean; savedAt: Date | null; error: string | null; save: () => Promise<boolean>; cancel: () => void; markSaved: (input: DevArticleInput) => void }}
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
  const savedFingerprint = useRef(
    fingerprint(initial ? articleToInput(initial) : emptyArticleInput()),
  );
  const [dirty, setDirty] = useState(false);

  const slugLocked = Boolean(initial?.firstPublishedAt);

  const applyForm = useCallback((next: DevArticleInput) => {
    setForm(next);
    setDirty(fingerprint(next) !== savedFingerprint.current);
  }, []);

  const patch = useCallback(
    (next: Partial<DevArticleInput>) =>
      setForm((previous) => {
        const merged = { ...previous, ...next };
        // 관리자가 주소를 아직 건드리지 않았으면 제목을 따라간다.
        const withSlug =
          next.title && !slugTouched && !slugLocked
            ? { ...merged, slug: suggestArticleSlug(merged.title) }
            : merged;
        setDirty(fingerprint(withSlug) !== savedFingerprint.current);
        return withSlug;
      }),
    [slugLocked, slugTouched],
  );

  const onSlugChange = useCallback(
    (value: string) => {
      setSlugTouched(true);
      patch({ slug: value });
    },
    [patch],
  );

  // 본문이 바뀔 때만 다시 파싱한다. 발행 조건과 편집기 오류 목록이 같은 결과를 본다.
  const markdownIssues = useMemo(() => parseArticleMarkdown(form.body).issues, [form.body]);

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
    savedFingerprint.current = fingerprint(input);
    setDirty(false);
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
      // 문서가 실제로 생겼으니 탭이 들고 있던 "저장 전 새 글 ID"도 놓아 준다.
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

  const cancel = useCallback(() => router.replace(ROUTES.ADMIN_DEV_ARTICLES), [router]);

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
    saving,
    savedAt,
    error,
    save,
    cancel,
    markSaved,
  };
};

export { useArticleEditor };
