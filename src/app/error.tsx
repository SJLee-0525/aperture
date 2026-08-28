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
 * 로케일 세그먼트 밖 에러 바운더리 — 렌더 중 오류를 잡는다(루트 레이아웃은 유지).
 * 스토어 모드 LangProvider 를 읽는다. 공개 트리에서 던진 오류는 URL 언어로 렌더하는
 * `[lang]/error.tsx` 가 먼저 받는다.
 * 바운더리가 오류를 삼키면 전역 핸들러가 못 보므로 여기서 직접 전송한다 —
 * 단, 동의 뒤 로드된 SDK가 있을 때만이고 미로드 시 콘솔 기록만 남는다(ADR-0004).
 *
 * @param props 오류 정보와 재시도 동작.
 * @param props.error 렌더링 중 포착한 오류.
 * @param props.reset 오류 경계를 다시 렌더링하는 콜백.
 * @returns 현재 언어의 오류 안내 화면.
 */
export default function Error({ error, reset }: Props) {
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
