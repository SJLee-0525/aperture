"use client";

import { useCallback, useState, type FormEvent } from "react";

/**
 * 연락 폼 제출 — Web3Forms(https://web3forms.com) 로 사이트 안에서 실제 발송.
 * access key 는 수신 메일 주소로만 매핑되는 공개용 키라 브라우저 노출이 안전하다
 * (원칙 #8 위반 아님 — 진짜 시크릿 아님). 서버 0대·월 $0 유지(무료 티어).
 * 키 미설정(로컬 dev 등) 시엔 기존 mailto 폴백 — 방문자 메일 앱을 연다.
 */
const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
const ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;

/** hCaptcha 위젯이 폼에 심는 토큰 필드 — Web3Forms 가 대시보드에서 캡차를 켜면 필수로 요구한다. */
const CAPTCHA_FIELD = "h-captcha-response";

/** 스크립트 로드 전이거나 캡차를 끈 환경에서도 안전하게 무시된다. */
const resetCaptchaWidget = () => {
  (window as { hcaptcha?: { reset: () => void } }).hcaptcha?.reset();
};

type SendStatus = "idle" | "sending" | "sent" | "error" | "captcha-required";

const useContactForm = (mailtoTo: string) => {
  const [status, setStatus] = useState<SendStatus>("idle");
  const resetStatus = useCallback(() => {
    setStatus((current) => (current === "idle" ? current : "idle"));
  }, []);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      const name = String(formData.get("name") ?? "").trim();
      const email = String(formData.get("email") ?? "").trim();
      const message = String(formData.get("message") ?? "").trim();
      const subject = `[Portfolio] ${name || "Contact"}`;
      // 허니팟 — 사람에겐 보이지 않는 체크박스라 값이 있으면 봇이다. 조용히 성공한 척 끝낸다.
      const botcheck = formData.get("botcheck") !== null;
      if (botcheck) {
        setStatus("sent");
        form.reset();
        return;
      }

      // 키 미설정 → mailto 폴백 (dev·미구성 환경에서도 폼이 죽지 않게).
      if (!ACCESS_KEY) {
        const body = `${message}\n\n— ${name} (${email})`;
        window.location.href = `mailto:${mailtoTo}?subject=${encodeURIComponent(
          subject,
        )}&body=${encodeURIComponent(body)}`;
        return;
      }

      // 캡차 미해결 상태로 보내면 Web3Forms 가 거부한다 — 실패 대신 무엇을 해야 하는지 알린다.
      const captchaToken = String(formData.get(CAPTCHA_FIELD) ?? "");
      if (!captchaToken) {
        setStatus("captcha-required");
        return;
      }

      setStatus("sending");
      try {
        const res = await fetch(WEB3FORMS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            access_key: ACCESS_KEY,
            subject,
            name,
            email,
            message,
            // Web3Forms 서버 측 허니팟 판정 — 클라이언트 차단을 우회해도 여기서 한 번 더 걸린다.
            botcheck,
            [CAPTCHA_FIELD]: captchaToken,
          }),
        });
        const data = (await res.json()) as { success: boolean };
        if (!data.success) throw new Error("Web3Forms 실패");

        setStatus("sent");
        form.reset();
        // hCaptcha 토큰은 1회용이라 위젯을 직접 리셋하지 않으면 두 번째 제출이 항상 거부된다
        // (form.reset() 은 위젯 내부 상태를 건드리지 못한다).
        resetCaptchaWidget();
      } catch {
        setStatus("error");
      }
    },
    [mailtoTo],
  );

  return { status, submit, resetStatus };
};

export { useContactForm };
