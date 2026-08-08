"use client";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * 루트 레이아웃(app/layout) 자체가 던진 오류를 잡는 최후의 폴백.
 * 이 컴포넌트는 루트 레이아웃을 "대체"하므로 자체 <html>/<body>를 렌더해야 하고,
 * LangProvider·globals.css·폰트·테마에 접근할 수 없다 → i18n·토큰 불가라 영어 고정 + 인라인 스타일로 자급.
 * 색은 Aperture 라이트 토큰과 동일하게 하드코딩(예외적으로 허용).
 *
 * @param {Props} props 전역 오류 복구 동작.
 * @param {() => void} props.reset 애플리케이션을 다시 렌더링하는 콜백.
 * @returns {JSX.Element} 자체 html·body를 포함한 최상위 오류 화면.
 */
export default function GlobalError({ reset }: Props) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#18181b",
          padding: "24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "560px" }}>
          <div
            style={{
              fontFamily: "system-ui, sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#0a84ff",
              marginBottom: "16px",
            }}
          >
            Error
          </div>
          <h1
            style={{
              margin: "0 0 16px",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: "44px",
              fontWeight: 500,
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              margin: "0 0 40px",
              maxWidth: "42ch",
              fontFamily: "system-ui, sans-serif",
              fontSize: "16px",
              lineHeight: 1.75,
              color: "#3f3f46",
            }}
          >
            An unexpected error occurred and the page can&rsquo;t be displayed. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              fontFamily: "system-ui, sans-serif",
              cursor: "pointer",
              background: "#0a84ff",
              color: "#ffffff",
              border: "none",
              padding: "12px 24px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
