"use client";

import { useEffect, useState } from "react";

/**
 * 타이핑 효과 — words 를 한 글자씩 타이핑 → 잠시 멈춤 → 삭제 → 다음 단어 순환.
 * 한글 완성형은 `[...word]` 로 코드포인트 분해(바이트 단위 깨짐 방지).
 * setState 는 setTimeout 콜백 안에서만 호출(effect 직접 setState 금지 규칙 준수).
 */
const useTyping = (words: string[]): string => {
  const [text, setText] = useState("");

  useEffect(() => {
    if (words.length === 0) return;
    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timer = setTimeout(tick, 400);

    function tick() {
      const chars = [...words[wordIndex]];
      setText(chars.slice(0, charIndex).join(""));

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

  return text;
};

export { useTyping };
