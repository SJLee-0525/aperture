"use client";

import { useEffect } from "react";

import { StatusView } from "@/features/status/_components/StatusView";

import { useLang } from "@/features/lang/_hooks/use-lang";

import { captureExceptionIfLoaded } from "@/instrumentation-client";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * 로케일 안의 에러 바운더리. `[lang]/layout` 의 경로 모드 LangProvider 아래라 저장된 선호가
 * 아니라 URL 의 언어로 렌더된다. 공개 트리에서 던진 오류가 여기로 온다.
 *
 * 바운더리가 오류를 삼키면 전역 핸들러가 못 보므로 여기서 직접 전송한다.
 * 단, 동의 뒤 로드된 SDK 가 있을 때만이고 미로드 시 콘솔 기록만 남는다(ADR-0004).
 *
 * @param {Props} props 오류 정보와 재시도 동작.
 * @param {Error & { digest?: string }} props.error 렌더링 중 포착한 오류.
 * @param {() => void} props.reset 오류 경계를 다시 렌더링하는 콜백.
 * @returns {JSX.Element} URL 언어의 오류 안내 화면.
 */
export default function LocaleError({ error, reset }: Props) {
  const { dict } = useLang();

  useEffect(() => {
    console.error(error);
    captureExceptionIfLoaded(error);
  }, [error]);

  return (
    <StatusView
      label={dict.errorLabel}
      title={dict.errorTitle}
      body={[dict.errorBody, dict.errorBody2]}
      homeLabel={dict.backHome}
      retryLabel={dict.errorRetry}
      onRetry={reset}
      note={error.digest ? `${dict.errorDigest}: ${error.digest}` : undefined}
    />
  );
}
