import { isSupabaseConfigured } from "@/lib/supabase/config";

type ContentSource = "mock" | "live";

/**
 * 콘텐츠 소스 스위치. getter 들이 실 Firestore 대신 mock 을 쓸지 결정한다.
 *
 * - 기본: **개발(`npm run dev`)에선 mock 우선** — 실 컬렉션이 비어도 UI가 채워져 테스트가 쉽다.
 *   음악·개발 섹션이 완성되기 전까지의 편의 (사용자 요청).
 * - **프로덕션 빌드(`npm run build`·Vercel)는 `NODE_ENV=production` → 실데이터.** 배포 안전(mock 노출 없음).
 * - 강제 override(`.env.local`): `NEXT_PUBLIC_USE_MOCK=1` → mock, `=0` → dev 에서도 항상 실데이터.
 *
 * ⚠️ 프로덕션 빌드에서 mock 을 켜는 것을 막는 일은 **여기서 하지 않는다.** 이 함수는 서버와
 *    브라우저 양쪽에서 도는데, 브라우저에는 배포 환경을 알려 줄 값이 없다(`NEXT_PUBLIC_` 이
 *    아닌 변수는 번들에 인라인되지 않는다). 그래서 판정은 빌드 시점 한 곳으로 올렸다 —
 *    `next.config.ts` 가 부르는 `assertDeployableContentSource`. 여기서는 빌드가 확정한
 *    플래그를 읽기만 한다.
 *
 * @returns {boolean}
 */
const mockContentEnabled = (): boolean => {
  const flag = process.env.NEXT_PUBLIC_USE_MOCK;
  if (flag === "1") return true;
  if (flag === "0") return false;
  return process.env.NODE_ENV !== "production";
};

/**
 * 개발 환경은 Supabase 설정이 없으면 mock 으로 동작할 수 있지만, 운영 환경에서는
 * 설정 누락을 콘텐츠 없음으로 위장하지 않는다. 명시적 mock 빌드만 예외다.
 *
 * @returns {boolean}
 */
const shouldUseMockContent = (): boolean => {
  if (mockContentEnabled()) return true;
  if (isSupabaseConfigured()) return false;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Supabase 공개 콘텐츠 설정이 없습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인하세요.",
    );
  }
  return true;
};

const getContentSource = (): ContentSource => (shouldUseMockContent() ? "mock" : "live");

export { getContentSource, shouldUseMockContent };
export type { ContentSource };
