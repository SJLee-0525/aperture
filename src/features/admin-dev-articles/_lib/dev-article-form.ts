import { normalizeArticleSlug } from "@/features/admin-dev-articles/_lib/dev-article-slug";

import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { DevArticleInput } from "@/features/admin-dev-articles/_lib/dev-article-repository";
import type { DevArticle } from "@/types/dev-article";
import type { LocalizedText } from "@/types/localized";

/**
 * 새 글의 초기값. 발행 상태는 항상 초안으로 시작한다 — 실수로 발행되는 쪽보다
 * 발행 버튼을 한 번 더 누르는 쪽이 낫다.
 *
 * @returns {DevArticleInput} 빈 폼 값.
 */
const emptyArticleInput = (): DevArticleInput => ({
  slug: "",
  title: EMPTY_TEXT,
  summary: EMPTY_TEXT,
  body: "",
  cover: null,
  coverAlt: null,
  tags: [],
  relatedProjectIds: [],
  pinned: false,
  published: false,
  publishedAt: null,
  firstPublishedAt: null,
});

/**
 * 저장된 글을 폼 값으로 되돌린다.
 *
 * @param {DevArticle} article 편집할 글.
 * @returns {DevArticleInput} 문서 ID와 시스템 시각을 뺀 폼 값.
 */
const articleToInput = (article: DevArticle): DevArticleInput => {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = article;
  void _id;
  void _createdAt;
  void _updatedAt;
  return input;
};

/**
 * 이중언어 값의 앞뒤 공백을 정리한다.
 *
 * @param {LocalizedText} text 정리할 값.
 * @returns {LocalizedText} 두 언어 모두 trim 한 값.
 */
const trimText = (text: LocalizedText): LocalizedText => ({
  ko: text.ko.trim(),
  en: text.en.trim(),
});

/**
 * 빈 값과 중복을 걷어낸 id 목록.
 *
 * @param {string[]} ids 폼이 들고 있는 id 배열.
 * @returns {string[]} 입력 순서를 유지한 유일한 id 목록.
 */
const cleanIds = (ids: string[]): string[] => [
  ...new Set(ids.map((id) => id.trim()).filter(Boolean)),
];

/**
 * 폼 값을 저장 형태로 맞춘다. 저장 직전 단 한 곳에서만 부른다.
 *
 * slug 는 여기서 정규화하고, 이미 발행한 적이 있으면(`firstPublishedAt`) 이전 값을 되돌려
 * 놓는다. UI 도 입력을 잠그지만 화면을 우회한 저장 경로가 URL 을 바꾸지 못하게 저장 함수에서
 * 한 번 더 막는다(계획 §2). 대표 이미지를 지우면 남아 있던 대체 텍스트도 함께 지운다 —
 * 다음 이미지에 엉뚱한 설명이 붙는 것을 막는다.
 *
 * @param {DevArticleInput} form 화면이 들고 있는 폼 값.
 * @param {DevArticle} [previous] 편집 중인 글의 이전 저장본. 새 글이면 없다.
 * @returns {DevArticleInput} 저장할 값.
 */
const prepareArticleInput = (form: DevArticleInput, previous?: DevArticle): DevArticleInput => ({
  ...form,
  slug: previous?.firstPublishedAt ? previous.slug : normalizeArticleSlug(form.slug),
  title: trimText(form.title),
  summary: trimText(form.summary),
  coverAlt: form.cover ? (form.coverAlt ?? null) : null,
  tags: cleanIds(form.tags),
  relatedProjectIds: cleanIds(form.relatedProjectIds),
});

export { articleToInput, emptyArticleInput, prepareArticleInput };
