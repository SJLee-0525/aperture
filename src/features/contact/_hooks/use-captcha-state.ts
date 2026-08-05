"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * hCaptcha 위젯이 폼에 심는 토큰 필드를 관찰해 "해결됨" 여부를 돌려준다.
 *
 * 콜백(data-callback) 대신 필드를 직접 읽는 이유:
 *  - 위젯을 Web3Forms 스크립트가 렌더하므로 콜백 배선이 그쪽 구현에 묶인다.
 *  - 토큰은 약 2분 뒤 만료되며 hCaptcha 가 필드를 비운다 — 폴링은 만료도 그대로 잡아낸다.
 * 값 변경은 property 대입이라 이벤트도 MutationObserver 도 뜨지 않으므로 폴링이 유일한 관찰 수단이다.
 */
const POLL_MS = 400;
const CAPTCHA_FIELD = 'textarea[name="h-captcha-response"], input[name="h-captcha-response"]';

type CaptchaState = {
  /** 위젯이 실제로 렌더됐는가 — 스크립트 차단·로드 실패면 false 로 남는다. */
  rendered: boolean;
  /** 유효한 토큰을 들고 있는가. */
  solved: boolean;
};

const IDLE: CaptchaState = { rendered: false, solved: false };

const useCaptchaState = (formRef: RefObject<HTMLFormElement | null>): CaptchaState => {
  const [state, setState] = useState<CaptchaState>(IDLE);

  useEffect(() => {
    const read = () => {
      const field = formRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        CAPTCHA_FIELD,
      );
      const next: CaptchaState = { rendered: Boolean(field), solved: Boolean(field?.value) };
      setState((current) =>
        current.rendered === next.rendered && current.solved === next.solved ? current : next,
      );
    };

    read();
    const timer = window.setInterval(read, POLL_MS);
    return () => window.clearInterval(timer);
  }, [formRef]);

  return state;
};

export { useCaptchaState };
