"use client";

import { useCallback, useState, type FormEvent } from "react";

/**
 * Web3Forms로 연락 폼을 제출한다. 키가 없으면 방문자의 메일 앱을 연다.
 */
const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
const ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;

/** hCaptcha 위젯이 폼에 추가하는 토큰 필드. */
const CAPTCHA_FIELD = "h-captcha-response";

/**
 * 스크립트 로드 전이거나 캡차를 끈 환경에서도 안전하게 무시된다.
 *
 * @returns {void}
 */
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

      // WebMCP는 입력만 채울 수 있으며 실제 전송은 사용자가 수행한다.
      const native = event.nativeEvent as SubmitEvent | undefined;
      if (native?.agentInvoked) {
        // WebMCP 호출에는 Promise 결과를 반환한다.
        // mailto 폴백(키 미설정) 환경에는 캡차가 없으므로 안내와 상태를 나눈다.
        native.respondWith?.(
          Promise.resolve(
            ACCESS_KEY
              ? "Form filled. The visitor must solve the captcha and press Send."
              : "Form filled. The visitor must press Send to open their mail app.",
          ),
        );
        if (ACCESS_KEY) setStatus("captcha-required");
        return;
      }

      const form = event.currentTarget;
      const formData = new FormData(form);
      const name = String(formData.get("name") ?? "").trim();
      const email = String(formData.get("email") ?? "").trim();
      const message = String(formData.get("message") ?? "").trim();
      const subject = `[Portfolio] ${name || "Contact"}`;
      // 보이지 않는 허니팟 필드에 값이 있으면 요청을 보내지 않는다.
      const botcheck = formData.get("botcheck") !== null;
      if (botcheck) {
        setStatus("sent");
        form.reset();
        return;
      }

      // 키가 없으면 mailto 링크를 연다.
      if (!ACCESS_KEY) {
        const body = `${message}\n\n— ${name} (${email})`;
        window.location.href = `mailto:${mailtoTo}?subject=${encodeURIComponent(
          subject,
        )}&body=${encodeURIComponent(body)}`;
        return;
      }

      // 캡차가 끝나지 않았으면 제출 방법을 안내한다.
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
            // Web3Forms에도 허니팟 필드 값을 전달한다.
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
