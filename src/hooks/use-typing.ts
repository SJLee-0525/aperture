"use client";

import { useEffect, useState } from "react";

/**
 * 타이핑 효과 — words 를 한 글자씩 타이핑 → 잠시 멈춤 → 삭제 → 다음 단어 순환.
 * 한글 완성형은 `[...word]` 로 코드포인트 분해(바이트 단위 깨짐 방지).
 * setState 는 setTimeout 콜백 안에서만 호출(effect 직접 setState 금지 규칙 준수).
 * `index`(현재 단어 인덱스)를 함께 반환 → 호출부가 단어별 색상 등을 매길 수 있다.
 * ⚠️ words 는 안정 참조여야 함(매 렌더 새 배열이면 effect 재시작 → 첫 글자에서 멈춤). 호출부에서 useMemo.
 *
 * @param {string[]} words
 * @returns {{ text: string; index: number }}
 */
const useTyping = (words: string[]): { text: string; index: number } => {
  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length === 0) return;
    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;

    // 모션 최소화 설정에서는 순환 없이 첫 단어를 정적으로 표시한다(시각 회귀 기준선도 결정적이 된다).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const staticTimer = setTimeout(() => {
        setText(words[0]);
        setIndex(0);
      }, 0);
      return () => clearTimeout(staticTimer);
    }

    let timer = setTimeout(tick, 400);

    function tick() {
      const chars = [...words[wordIndex]];
      setText(chars.slice(0, charIndex).join(""));
      setIndex(wordIndex);

      if (!deleting && charIndex >= chars.length) {
        deleting = true;
        timer = setTimeout(tick, 1500); // 완성 후 멈춤
        return;
      }
      if (deleting && charIndex <= 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        timer = setTimeout(tick, 240);
        return;
      }
      charIndex += deleting ? -1 : 1;
      timer = setTimeout(tick, deleting ? 45 : 85);
    }

    return () => clearTimeout(timer);
  }, [words]);

  return { text, index };
};

export { useTyping };
