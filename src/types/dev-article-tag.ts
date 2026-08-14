/**
 * 블로그 태그 사전 항목. `DevArticle.tags` 는 라벨이 아니라 이 `id` 를 참조한다.
 *
 * 사진 태그(`types/tag.ts` 의 `Tag`)와 표시 계약은 같지만 별칭으로 두지 않는다.
 * 사진 태그는 촬영 주제라 사전이 거의 고정이고 `site/config` 안에서 관리하는 반면,
 * 블로그 태그는 글을 쓰면서 늘어나고 이름이 바뀌며 B5 에서 별도 컬렉션이 된다.
 * 한쪽 사전의 필드가 늘어날 때 다른 쪽이 따라 바뀌지 않아야 한다.
 *
 * `React`, `Next.js` 처럼 번역할 이유가 없는 기술명은 ko·en 에 같은 값을 넣는다.
 */
type DevArticleTag = {
  id: string;
  ko: string;
  en: string;
};

export type { DevArticleTag };
