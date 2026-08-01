import type { SectionId } from "@/constants/sections";

type SiteTheme = "light" | "dark";

const BROWSER_THEME_COLORS: Record<SiteTheme, Record<SectionId, string>> = {
  light: {
    home: "#ffffff",
    photo: "#0066cc",
    music: "#b4232d",
    dev: "#087a32",
    contact: "#a84d00",
  },
  dark: {
    home: "#000000",
    photo: "#4da3ff",
    music: "#ff5b60",
    dev: "#2ecc71",
    contact: "#fb923c",
  },
};

const browserThemeColor = (section: SectionId, theme: SiteTheme): string =>
  BROWSER_THEME_COLORS[theme][section];

/** 모바일 브라우저 주소창·탭 UI 색을 현재 섹션과 테마에 맞춘다. */
const syncBrowserThemeColor = (section: SectionId, theme?: SiteTheme) => {
  const currentTheme =
    theme ?? (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.append(meta);
  }
  meta.content = browserThemeColor(section, currentTheme);
};

export { BROWSER_THEME_COLORS, browserThemeColor, syncBrowserThemeColor };
export type { SiteTheme };
