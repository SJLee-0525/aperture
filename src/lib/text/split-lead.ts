/** 첫 문장과 나머지. 첫 문장뿐이면 `body` 는 빈 문자열이다. */
type Lead = {
  lead: string;
  body: string;
};

/**
 * 소개 글의 첫 문장을 요약 헤드라인으로 떼어 낸다.
 *
 * 관리자는 소개를 한 덩어리로 편집한다. 화면이 헤드라인과 본문을 나눠 그리므로 그 경계를
 * 여기서 정한다. 마침표 뒤 공백을 경계로 삼기 때문에 한국어 문장에도 마침표가 필요하고,
 * 마침표가 없으면 전체가 헤드라인이 된다.
 */
const splitLead = (text: string): Lead => {
  const at = text.indexOf(". ");
  if (at === -1) return { lead: text, body: "" };
  return { lead: text.slice(0, at), body: text.slice(at + 2) };
};

export { splitLead };
