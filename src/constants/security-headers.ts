/**
 * `next.config.ts`가 모든 경로에 적용하는 HTTP 보안 헤더.
 *
 * X-Frame-Options는 관리자 로그인 화면을 이용한 클릭재킹을 차단한다.
 */

/** CSP와 preconnect가 공유하는 외부 호스트 목록. */
const FIREBASE_HOSTS = [
  "https://firestore.googleapis.com",
  "https://identitytoolkit.googleapis.com",
  "https://securetoken.googleapis.com",
  "https://firebasestorage.googleapis.com",
  "https://storage.googleapis.com",
  "https://www.googleapis.com",
] as const;

/**
 * MapLibre 스타일과 타일, sprite, glyph를 제공하는 CARTO 호스트.
 * style.json 은 `basemaps.cartocdn.com`, 실제 벡터 타일(.mvt)은 샤딩된
 * `tiles-a`~`tiles-d.basemaps.cartocdn.com`에서 온다. 와일드카드는 bare 도메인을
 * 포함하지 않으므로 두 주소를 모두 등록한다.
 */
const CARTO_HOSTS = ["https://basemaps.cartocdn.com", "https://*.basemaps.cartocdn.com"] as const;

/**
 * Supabase 프로젝트 origin. 인증·PostgREST·Storage 가 전부 이 호스트를 쓴다.
 * env 미설정(mock 개발·단위 테스트)이면 목록에서 빠져 정책이 넓어지지 않는다.
 */
const supabaseHost = (): string | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

/**
 * 관리자가 올린 이미지가 실제로 저장되는 호스트.
 * 블로그 본문 Markdown 의 이미지 출처 정책(`features/dev-blog/_lib/markdown-url-policy.ts`)이
 * 같은 목록을 사용해 CSP와 렌더 정책이 어긋나지 않게 한다.
 * Firebase 호스트는 이전 완료(M8) 전까지 유지한다. mock 업로더가 [0]의 Firebase URL 형태를
 * 쓰므로 Supabase 는 끝에 붙인다.
 */
const STORAGE_IMAGE_HOSTS = [
  "https://firebasestorage.googleapis.com",
  "https://storage.googleapis.com",
  ...(supabaseHost() ? [supabaseHost() as string] : []),
];

const IMAGE_HOSTS = [...STORAGE_IMAGE_HOSTS, "https://i.ytimg.com", ...CARTO_HOSTS] as const;

const YOUTUBE_FRAME_HOSTS = [
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
] as const;

/**
 * 관리자 사진 편집의 장소 검색(OpenStreetMap Nominatim, `lib/geo/geocode.ts`).
 * connect-src 에 없으면 CSP 가 요청을 차단하고 화면에는 네트워크 오류로 위장된다.
 */
const GEOCODING_HOSTS = ["https://nominatim.openstreetmap.org"] as const;

/**
 * Web3Forms가 사용하는 hCaptcha 호스트.
 * hCaptcha 는 스크립트·프레임·스타일·XHR 을 모두 자기 호스트에서 가져오므로 네 지시어에 함께 넣는다.
 * 하나라도 빠지면 위젯이 표시되지 않아 폼을 제출할 수 없다.
 */
const CAPTCHA_HOSTS = [
  "https://web3forms.com",
  "https://hcaptcha.com",
  "https://*.hcaptcha.com",
] as const;

/**
 * GA4 로더와 이벤트 수집 호스트.
 * 지역 엔드포인트(`region1.google-analytics.com`)와 서버 사이드 리디렉션 대상
 * (`*.analytics.google.com`)도 허용해야 모든 이벤트를 전송할 수 있다.
 */
const ANALYTICS_SCRIPT_HOSTS = ["https://www.googletagmanager.com"] as const;

const ANALYTICS_CONNECT_HOSTS = [
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
] as const;

/**
 * ⚠️ script-src 'unsafe-inline' 은 테마·lang no-flash 인라인 스크립트와 Next 부트스트랩 때문이다.
 * nonce 로 좁히려면 middleware 에서 요청마다 nonce 를 발급해 두 스크립트에 주입해야 한다.
 * style-src 'unsafe-inline' 은 React inline style prop(24곳)과 MapLibre 런타임 스타일 때문.
 *
 * connect-src는 허용하지 않은 전송을 막고, base-uri와 form-action은 주입된
 * `<base>` 및 폼 대상 변경을 차단한다.
 *
 * 'unsafe-eval'은 webpack HMR과 React Refresh 때문에 개발 환경에서만 허용한다.
 * 프로덕션 빌드는 eval 을 쓰지 않으므로 배포 정책에는 절대 들어가지 않아야 한다.
 *
 * @param {boolean} isDevelopment
 * @returns {string}
 */
const buildContentSecurityPolicy = (isDevelopment: boolean) => {
  // 테스트가 env 를 스텁한 뒤 호출할 수 있도록 모듈 로드가 아니라 호출 시점에 읽는다.
  const supabase = supabaseHost();
  const supabaseHosts = supabase ? [supabase] : [];
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${["'self'", "'unsafe-inline'", ...(isDevelopment ? ["'unsafe-eval'"] : []), ...CAPTCHA_HOSTS, ...ANALYTICS_SCRIPT_HOSTS].join(" ")}`,
    // Next 부트스트랩과 no-flash <script> 때문에 script-src의 unsafe-inline은 당장 유지하되,
    // 주입된 onerror/onclick 속성과 javascript: URL은 별도 지시어로 실행을 막는다.
    "script-src-attr 'none'",
    `style-src 'self' 'unsafe-inline' ${CAPTCHA_HOSTS.join(" ")}`,
    "font-src 'self' data:",
    // GA 는 fetch/beacon 이 막히면 1x1 픽셀로 폴백하므로 img-src 에도 같은 호스트가 필요하다.
    `img-src 'self' data: blob: ${[...new Set([...IMAGE_HOSTS, ...supabaseHosts, ...ANALYTICS_CONNECT_HOSTS])].join(" ")}`,
    // blob: 은 업로드 전 압축본(browser-image-compression)·내보내기 canvas 결과를 다시 읽는 경로.
    // data: 는 어느 경로도 fetch 하지 않아 넣지 않는다.
    `connect-src 'self' blob: ${[...FIREBASE_HOSTS, ...supabaseHosts, ...CARTO_HOSTS, ...GEOCODING_HOSTS, "https://api.web3forms.com", ...CAPTCHA_HOSTS, ...ANALYTICS_CONNECT_HOSTS].join(" ")}`,
    `frame-src ${[...YOUTUBE_FRAME_HOSTS, ...CAPTCHA_HOSTS].join(" ")}`,
    // MapLibre 워커가 사용하는 blob: URL을 허용한다.
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
};

const CONTENT_SECURITY_POLICY = buildContentSecurityPolicy(process.env.NODE_ENV !== "production");

/**
 * 위반 리소스를 차단하는 CSP 강제 모드.
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
  // tools=(self) — WebMCP 도구 등록을 동일 출처로 한정한다(기본값 의존 대신 문서화된 거부).
  // 교차 출처 iframe 이 <iframe allow="tools"> 로 위임받는 경로를 명시적으로 차단한다.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), tools=(self)",
  },
  // 브라우저 프리로드 목록(hstspreload.org) 등록은 하지 않는다 — `preload` 토큰이 없으면
  // 제출해도 거부된다. 등록은 서브도메인 전체를 HTTPS 전용으로 못 박고 해제에 수개월이 걸려,
  // 개인 사이트가 되돌리기 어려운 약속을 할 이유가 없다. 필요해지면 토큰 추가 + 직접 제출.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: CSP_HEADER_NAME, value: CONTENT_SECURITY_POLICY },
] as const;

export { buildContentSecurityPolicy, SECURITY_HEADERS, STORAGE_IMAGE_HOSTS };
