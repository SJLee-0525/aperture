type SiteTheme = "light" | "dark";

const BROWSER_THEME_COLORS: Record<SiteTheme, string> = {
  light: "#ffffff",
  dark: "#000000",
};

const browserThemeColor = (theme: SiteTheme): string => BROWSER_THEME_COLORS[theme];

/** 모바일 브라우저 주소창·탭 UI 색을 실제 페이지 배경색과 맞춘다. */
const syncBrowserThemeColor = (theme?: SiteTheme) => {
  const currentTheme =
    theme ?? (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.append(meta);
  }
  meta.content = browserThemeColor(currentTheme);
};

export { BROWSER_THEME_COLORS, browserThemeColor, syncBrowserThemeColor };
