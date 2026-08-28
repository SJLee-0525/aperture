/**
 * 한국어 조사를 앞 글자의 받침으로 고른다.
 *
 * "을(를)" 로 적으면 화면 문구가 문서처럼 읽힌다. 관리자 화면은 한국어 전용이라
 * 실행 시점에 고르는 것이 가능하다.
 */

/** 한글 음절의 종성 유무. 한글이 아니면 받침이 없는 것으로 본다. */
const hasFinalConsonant = (word: string): boolean => {
  const code = word.trim().slice(-1).charCodeAt(0);
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
};

/**
 * 목적격 조사.
 *
 * @param word 조사 앞에 오는 말.
 * @returns 받침이 있으면 "을", 없으면 "를".
 */
const objectParticle = (word: string): string => (hasFinalConsonant(word) ? "을" : "를");

/**
 * 주격 조사.
 *
 * @param word 조사 앞에 오는 말.
 * @returns 받침이 있으면 "이", 없으면 "가".
 */
const subjectParticle = (word: string): string => (hasFinalConsonant(word) ? "이" : "가");

export { objectParticle, subjectParticle };
