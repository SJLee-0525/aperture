import { STORAGE_KEYS } from "@/constants/storage-keys";

/**
 * 다크모드 no-flash 스크립트.
 * <head>에서 동기 실행되어 첫 페인트 전에 html[data-theme]를 복원한다.
 * 기본값이 light이므로 prefers-color-scheme 자동 추종은 하지 않고
 * 사용자가 토글해 저장한 dark 값만 복원한다.
 */
const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem("${STORAGE_KEYS.THEME}")==="dark"){document.documentElement.dataset.theme="dark";}}catch(e){}})();`;

export { THEME_INIT_SCRIPT };
