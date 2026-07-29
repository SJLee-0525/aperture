/**
 * Firebase 웹 설정이 env(.env.local)에 채워졌는지 판별 — 서버·클라 공용.
 * NEXT_PUBLIC_* 는 빌드 시 인라인되므로 서버/브라우저 양쪽에서 안전하게 읽힌다.
 *
 * - 공개 페이지 getter(lib/content/*): 미설정이면 Firestore REST 대신 mock 폴백.
 * 진짜 보안 경계가 아니다(웹 키는 공개돼도 안전, 보안은 Security Rules 담당) — 단지
 * "백엔드에 연결 가능한 상태인가"를 한 곳에서 판별하기 위한 스위치다.
 */
const isFirebaseConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

export { isFirebaseConfigured };
