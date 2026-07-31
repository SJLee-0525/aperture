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

type SendStatus = "idle" | "sending" | "sent" | "error";

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

      // 키 미설정 → mailto 폴백 (dev·미구성 환경에서도 폼이 죽지 않게).
      if (!ACCESS_KEY) {
        const body = `${message}\n\n— ${name} (${email})`;
        window.location.href = `mailto:${mailtoTo}?subject=${encodeURIComponent(
          subject,
        )}&body=${encodeURIComponent(body)}`;
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
          }),
        });
        const data = (await res.json()) as { success: boolean };
        if (!data.success) throw new Error("Web3Forms 실패");

        setStatus("sent");
        form.reset();
      } catch {
        setStatus("error");
      }
    },
    [mailtoTo],
  );

  return { status, submit, resetStatus };
};

export { useContactForm };
