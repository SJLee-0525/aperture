/**
 * 전역 HTTP 보안 응답 헤더 — `next.config.ts` 의 headers() 가 모든 경로에 적용한다.
 *
 * 이 저장소에는 백엔드가 없어 응답 헤더가 브라우저 측 방어의 전부다.
 * 특히 X-Frame-Options 는 `/admin/login` 이 iframe 에 실려 클릭재킹으로
 * 관리자 1명의 계정이 탈취되는 경로를 막는다 (뚫리면 전 섹션 쓰기 권한이 넘어간다).
 */

/** 외부 의존 호스트 — CSP 와 preconnect 가 같은 목록을 보도록 한곳에서 정의한다. */
const FIREBASE_HOSTS = [
  "https://firestore.googleapis.com",
  "https://identitytoolkit.googleapis.com",
  "https://securetoken.googleapis.com",
  "https://firebasestorage.googleapis.com",
  "https://storage.googleapis.com",
  "https://www.googleapis.com",
] as const;

/** MapLibre 스타일(style.json)과 타일·sprite·glyphs — 키 없는 CARTO 무료 타일. */
const CARTO_HOSTS = [
  "https://basemaps.cartocdn.com",
  "https://tiles.basemaps.cartocdn.com",
] as const;

const IMAGE_HOSTS = [
  "https://firebasestorage.googleapis.com",
  "https://storage.googleapis.com",
  "https://i.ytimg.com",
  ...CARTO_HOSTS,
] as const;

const YOUTUBE_FRAME_HOSTS = [
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
] as const;

/**
 * 연락 폼 스팸 차단 — Web3Forms 클라이언트 스크립트가 hCaptcha 위젯을 렌더한다.
 * hCaptcha 는 스크립트·프레임·스타일·XHR 을 모두 자기 호스트에서 가져오므로 네 지시어에 함께 넣는다.
 * 하나라도 빠지면 위젯이 안 뜨고, 토큰이 없으니 Web3Forms 가 제출을 거부한다(= 폼 전체가 죽는다).
 */
const CAPTCHA_HOSTS = [
  "https://web3forms.com",
  "https://hcaptcha.com",
  "https://*.hcaptcha.com",
] as const;

/**
 * ⚠️ script-src 'unsafe-inline' 은 테마·lang no-flash 인라인 스크립트와 Next 부트스트랩 때문이다.
 * nonce 로 좁히려면 middleware 에서 요청마다 nonce 를 발급해 두 스크립트에 주입해야 한다.
 * style-src 'unsafe-inline' 은 React inline style prop(24곳)과 MapLibre 런타임 스타일 때문.
 *
 * 스크립트가 느슨해도 나머지는 실질 방어가 된다 —
 * connect-src 가 유출 통로를, base-uri·form-action 이 주입된 <base>·폼 하이재킹을 막는다.
 *
 * 'unsafe-eval' 은 개발에서만 연다 — Next dev(webpack HMR·React Refresh)가 모듈을 `eval` 로
 * 감싸기 때문이다. 빠뜨리면 dev 서버의 스크립트가 통째로 차단돼 하이드레이션이 죽는다.
 * 프로덕션 빌드는 eval 을 쓰지 않으므로 배포 정책에는 절대 들어가지 않아야 한다.
 */
const buildContentSecurityPolicy = (isDevelopment: boolean) =>
  [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${["'self'", "'unsafe-inline'", ...(isDevelopment ? ["'unsafe-eval'"] : []), ...CAPTCHA_HOSTS].join(" ")}`,
    `style-src 'self' 'unsafe-inline' ${CAPTCHA_HOSTS.join(" ")}`,
    "font-src 'self' data:",
    `img-src 'self' data: blob: ${IMAGE_HOSTS.join(" ")}`,
    // blob: 은 업로드 전 압축본(browser-image-compression)·내보내기 canvas 결과를 다시 읽는 경로.
    // data: 는 어느 경로도 fetch 하지 않아 넣지 않는다.
    `connect-src 'self' blob: ${[...FIREBASE_HOSTS, ...CARTO_HOSTS, "https://api.web3forms.com", ...CAPTCHA_HOSTS].join(" ")}`,
    `frame-src ${[...YOUTUBE_FRAME_HOSTS, ...CAPTCHA_HOSTS].join(" ")}`,
    // MapLibre 는 워커를 blob: URL 로 생성한다 — 빠지면 지도가 통째로 죽는다.
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");

const CONTENT_SECURITY_POLICY = buildContentSecurityPolicy(process.env.NODE_ENV !== "production");

/**
 * 강제 모드 — 위반 리소스는 실제로 차단된다.
 * 외부 호스트를 새로 붙일 때(임베드·위젯·폰트 CDN 등)는 위 목록에 먼저 추가해야 한다.
 * 되돌려 관찰만 하려면 `Content-Security-Policy-Report-Only` 로 바꾼다
 * (그 경우 브라우저가 upgrade-insecure-requests 를 무시하며 콘솔 경고를 남긴다).
 */
const CSP_HEADER_NAME = "Content-Security-Policy";

const SECURITY_HEADERS = [
  // 클릭재킹 차단. CSP frame-ancestors 와 중복이지만 이쪽이 구형 브라우저 대비 폴백이다.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // 브라우저 프리로드 목록(hstspreload.org) 등록은 하지 않는다 — `preload` 토큰이 없으면
  // 제출해도 거부된다. 등록은 서브도메인 전체를 HTTPS 전용으로 못 박고 해제에 수개월이 걸려,
  // 개인 사이트가 되돌리기 어려운 약속을 할 이유가 없다. 필요해지면 토큰 추가 + 직접 제출.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: CSP_HEADER_NAME, value: CONTENT_SECURITY_POLICY },
] as const;

export { buildContentSecurityPolicy, SECURITY_HEADERS };
