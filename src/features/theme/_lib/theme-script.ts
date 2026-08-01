import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "@/constants/storage-keys";
import { DEFAULT_SECTION, SECTION_BY_PREFIX } from "@/constants/sections";
import { BROWSER_THEME_COLORS } from "@/features/theme/_lib/browser-theme-color";

/**
 * 다크모드 no-flash 스크립트.
 * <head>에서 동기 실행되어 첫 페인트 전에 html[data-theme]를 복원한다.
 * 기본값이 light이므로 prefers-color-scheme 자동 추종은 하지 않고
 * 사용자가 토글해 저장한 dark 값만 복원한다.
 */
const THEME_INIT_SCRIPT = `(function(){var theme="light";try{var key="${STORAGE_KEYS.THEME}",legacyKey="${LEGACY_STORAGE_KEYS.THEME}",stored=localStorage.getItem(key);if(stored===null){stored=localStorage.getItem(legacyKey);if(stored!==null){localStorage.setItem(key,stored);localStorage.removeItem(legacyKey);}}theme=stored==="dark"?"dark":"light";}catch(e){}try{if(theme==="dark"){document.documentElement.dataset.theme="dark";}var path=location.pathname,routes=${JSON.stringify(SECTION_BY_PREFIX)},section="${DEFAULT_SECTION}";for(var i=0;i<routes.length;i++){var prefix=routes[i].prefix;if(path===prefix||path.indexOf(prefix+"/")===0){section=routes[i].section;break;}}var colors=${JSON.stringify(BROWSER_THEME_COLORS)},meta=document.querySelector('meta[name="theme-color"]');document.documentElement.dataset.section=section;if(!meta){meta=document.createElement("meta");meta.name="theme-color";document.head.appendChild(meta);}meta.content=colors[theme];}catch(e){}})();`;

export { THEME_INIT_SCRIPT };
