import type { Lang } from "@/types/lang";

/**
 * `<html lang>` 첫 페인트 교정용 인라인 스크립트 (theme-script와 같은 no-flash 패턴).
 * 루트 layout은 `[lang]` 세그먼트에 접근할 수 없어 SSR HTML이 항상 lang="ko"로 나가므로,
 * `[lang]/layout.tsx`가 이 스크립트로 hydration 전에 실제 언어를 반영한다.
 */
const langInitScript = (lang: Lang) => `document.documentElement.lang=${JSON.stringify(lang)};`;

export { langInitScript };
