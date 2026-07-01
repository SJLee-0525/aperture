"use client";

/**
 * M0 부트 확인용 임시 홈. 토큰·폰트·테마·언어 Provider 동작을 눈으로 확인한다.
 * Slice 2에서 작업(Work) 그리드 <GalleryView>로 교체 예정.
 */
import { useLang } from "@/features/lang/use-lang";
import { useThemeToggle } from "@/features/theme/use-theme-toggle";
import type { Lang } from "@/types/lang";

const btn: React.CSSProperties = {
  padding: "9px 16px",
  border: "1px solid var(--line-strong)",
  background: "var(--surface-1)",
  color: "var(--text)",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  fontSize: "var(--t-small)",
};

export default function Home() {
  const { lang, dict, setLang } = useLang();
  const { toggleTheme } = useThemeToggle();
  const other: Lang = lang === "ko" ? "en" : "ko";

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "var(--s-16) var(--s-6)" }}>
      <p className="u-label">{dict.brandTagline}</p>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--t-display)",
          fontWeight: 500,
          margin: "var(--s-3) 0",
          letterSpacing: "-0.01em",
        }}
      >
        Aperture<span style={{ color: "var(--accent)" }}>.</span>
      </h1>
      <p style={{ color: "var(--text-2)", maxWidth: "48ch" }}>{dict.bootHello}</p>
      <p className="u-mono" style={{ marginTop: "var(--s-4)", color: "var(--text-3)" }}>
        f/2.8 · 1/500 · ISO 100 · 35 mm
      </p>
      <div style={{ display: "flex", gap: "var(--s-3)", marginTop: "var(--s-8)" }}>
        <button type="button" onClick={toggleTheme} style={btn}>
          {dict.themeToggle}
        </button>
        <button type="button" onClick={() => setLang(other)} style={btn}>
          {other.toUpperCase()}
        </button>
      </div>
      <p style={{ marginTop: "var(--s-6)", fontSize: "var(--t-micro)", color: "var(--text-4)" }}>
        M0 부트 확인용 임시 화면 — Slice 2에서 작업 그리드로 교체
      </p>
    </main>
  );
}
