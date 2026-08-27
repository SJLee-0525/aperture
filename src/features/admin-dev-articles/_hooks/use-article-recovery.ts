"use client";

import { useFormRecovery } from "@/features/admin-shell/_hooks/use-form-recovery";

import { fromStoredArticleInput } from "@/features/admin-dev-articles/_lib/dev-article-recovery";

import { articleRecoverySlot } from "@/lib/admin/form-recovery";

import type { DevArticleInput } from "@/features/admin-dev-articles/_lib/dev-article-repository";

/**
 * 블로그 편집기의 복구본.
 *
 * 저장 형식과 만료 규칙은 다른 열한 개 폼과 같은 `useFormRecovery` 를 쓴다. 다른 것은
 * 저장 슬롯 하나뿐이다 — 접두사와 형식 버전이 이 모듈보다 먼저 정해졌고, 기본 슬롯으로
 * 바꾸면 관리자 브라우저에 남아 있는 복구본이 형식 불일치로 전부 버려진다.
 *
 * @param {string} articleId 편집 중인 글의 문서 ID.
 * @param {DevArticleInput} form 현재 폼 값.
 * @param {boolean} dirty 저장 이후 바뀐 것이 있는지.
 */
const useArticleRecovery = (articleId: string, form: DevArticleInput, dirty: boolean) =>
  useFormRecovery<DevArticleInput>(articleRecoverySlot(articleId), form, dirty, {
    revive: fromStoredArticleInput,
  });

export { useArticleRecovery };
