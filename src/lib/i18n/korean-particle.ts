/**
 * 한국어 목적격 조사를 앞 글자의 받침으로 고른다.
 *
 * "을(를)" 로 적으면 화면 문구가 문서처럼 읽힌다. 관리자 화면은 한국어 전용이라
 * 실행 시점에 고르는 것이 가능하다.
 *
 * @param word 조사 앞에 오는 말.
 * @returns 받침이 있으면 "을", 없으면 "를". 한글이 아니면 "를".
 */
const objectParticle = (word: string): string => {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return "를";
  return (code - 0xac00) % 28 === 0 ? "를" : "을";
};

export { objectParticle };
