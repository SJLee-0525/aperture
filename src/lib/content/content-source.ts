import { isFirebaseConfigured } from "@/lib/firebase/config";

type ContentSource = "mock" | "live";

/**
 * 콘텐츠 소스 스위치. getter 들이 실 Firestore 대신 mock 을 쓸지 결정한다.
 *
 * - 기본: **개발(`npm run dev`)에선 mock 우선** — 실 컬렉션이 비어도 UI가 채워져 테스트가 쉽다.
 *   음악·개발 섹션이 완성되기 전까지의 편의 (사용자 요청).
 * - **프로덕션 빌드(`npm run build`·Vercel)는 `NODE_ENV=production` → 실데이터.** 배포 안전(mock 노출 없음).
 * - 강제 override(`.env.local`): `NEXT_PUBLIC_USE_MOCK=1` → mock(개발 한정), `=0` → dev 에서도 항상 실데이터.
 *
 * ⚠️ Vercel 프로덕션 빌드 + `NEXT_PUBLIC_USE_MOCK=1` 은 즉시 throw — 실서비스에 mock 이 노출되는
 *    사고를 빌드(정적 생성) 단계에서 원천 차단한다. deploy-check 의 사람 확인에만 의존하지 않는다.
 *    로컬 `npm run build` 는 mock 빌드 점검 용도로 계속 허용한다(Vercel 이 아니므로 실서비스 아님).
 */
const mockContentEnabled = (): boolean => {
  const flag = process.env.NEXT_PUBLIC_USE_MOCK;
  if (flag === "1") {
    if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
      throw new Error(
        "NEXT_PUBLIC_USE_MOCK=1 은 Vercel 프로덕션 빌드에서 금지다 — 실서비스가 mock 콘텐츠를 보여주게 된다. Vercel 환경변수에서 제거하라.",
      );
    }
    return true;
  }
  if (flag === "0") return false;
  return process.env.NODE_ENV !== "production";
};

/**
 * 개발 환경은 Firebase 설정이 없으면 mock 으로 동작할 수 있지만, 운영 환경에서는
 * 설정 누락을 콘텐츠 없음으로 위장하지 않는다. 명시적 mock 빌드만 예외다.
 */
const shouldUseMockContent = (): boolean => {
  if (mockContentEnabled()) return true;
  if (isFirebaseConfigured()) return false;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Firebase 공개 콘텐츠 설정이 없습니다. NEXT_PUBLIC_FIREBASE_PROJECT_ID와 NEXT_PUBLIC_FIREBASE_API_KEY를 확인하세요.",
    );
  }
  return true;
};

const getContentSource = (): ContentSource => (shouldUseMockContent() ? "mock" : "live");

export { getContentSource, shouldUseMockContent };
export type { ContentSource };
