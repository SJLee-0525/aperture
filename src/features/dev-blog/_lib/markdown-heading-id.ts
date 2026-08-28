/** 라틴·숫자가 아닌 문자를 지울 때 한글이 함께 지워지지 않도록 유니코드 속성으로 판정한다. */
const NON_SLUG_CHARACTER = /[^\p{L}\p{N}]+/gu;

/** 평문에서 아무 글자도 남지 않았을 때 쓰는 값. 이모지만 있는 제목이 빈 fragment 가 되는 것을 막는다. */
const FALLBACK_HEADING_SLUG = "section";

/**
 * heading 평문을 URL fragment 로 쓸 수 있는 slug 로 바꾼다.
 * 한글 제목이 대부분이라 라틴 문자만 남기지 않고 모든 언어의 글자를 유지한다.
 *
 * @param text heading 의 평문.
 * @returns 소문자 slug. 남는 글자가 없으면 `section`.
 */
const toHeadingSlug = (text: string): string => {
  const slug = text.trim().toLowerCase().replace(NON_SLUG_CHARACTER, "-").replace(/^-|-$/g, "");
  return slug || FALLBACK_HEADING_SLUG;
};

/**
 * 문서 하나에서 heading id 를 발급한다. 같은 제목이 다시 나오면 문서 순서대로 `-2`, `-3` 을 붙인다.
 *
 * 목차·본문 heading·URL fragment 가 같은 값을 써야 하므로 id 는 한 곳에서만 만든다.
 * 문서마다 호출자가 새 factory 를 만들어야 한다 — 상태(이미 쓴 slug)를 안에 들고 있어서
 * 두 글이 같은 factory 를 나눠 쓰면 두 번째 글의 첫 heading 부터 `-2` 가 붙는다.
 *
 * @returns 평문을 받아 문서 안에서 유일한 id 를 돌려주는 함수.
 */
const createHeadingIdFactory = (): ((text: string) => string) => {
  // 세는 대상은 slug 등장 횟수가 아니라 **이미 발급한 id** 다. 횟수만 세면 뒤에 붙인 번호가
  // 다른 제목의 slug 와 부딪친다 — `정리` · `정리 2` · `정리` 는 두 번째와 세 번째가 모두
  // `정리-2` 가 되어 목차와 fragment 가 같은 곳을 가리킨다.
  const issued = new Set<string>();

  return (text: string) => {
    const slug = toHeadingSlug(text);
    let id = slug;
    for (let suffix = 2; issued.has(id); suffix += 1) id = `${slug}-${suffix}`;
    issued.add(id);
    return id;
  };
};

export { createHeadingIdFactory, toHeadingSlug };
