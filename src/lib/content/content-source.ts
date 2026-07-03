/**
 * 콘텐츠 소스 스위치 (개발 편의). getter 들이 실 Firestore 대신 mock 을 쓸지 결정한다.
 *
 * - 기본: **개발(`npm run dev`)에선 mock 우선** — 실 컬렉션이 비어도 UI가 채워져 테스트가 쉽다.
 *   음악·개발 섹션이 완성되기 전까지의 편의 (사용자 요청).
 * - **프로덕션 빌드(`npm run build`·Vercel)는 `NODE_ENV=production` → 실데이터.** 배포 안전(mock 노출 없음).
 * - 강제 override(`.env.local`): `NEXT_PUBLIC_USE_MOCK=1` → 항상 mock, `=0` → dev 에서도 항상 실데이터.
 *
 * ⚠️ 프로덕션에서 `NEXT_PUBLIC_USE_MOCK=1` 이면 실서비스가 mock 을 보여준다 — deploy-check 가 확인.
 */
const mockContentEnabled = (): boolean => {
  const flag = process.env.NEXT_PUBLIC_USE_MOCK;
  if (flag === "1") return true;
  if (flag === "0") return false;
  return process.env.NODE_ENV !== "production";
};

export { mockContentEnabled };
