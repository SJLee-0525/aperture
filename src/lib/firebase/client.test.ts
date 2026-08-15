import { getApps } from "firebase/app";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * 이 파일이 지키는 계약: **모듈을 불러오는 것만으로는 Firebase 앱이 생기지 않는다.**
 *
 * 예전에는 `client.ts` 가 최상위에서 `getAuth(app)` 까지 실행했다. 그래서 설정이 없으면
 * 관리자 화면 트리 어딘가에서 이 모듈에 닿는 순간 `auth/invalid-api-key` 로 멈췄고,
 * 프리렌더가 Client Component 를 평가하는 빌드도 같은 이유로 더미 키를 필요로 했다.
 * Supabase 이전 과도기에 남은 Firebase 소비처는 Storage 계열뿐이다(M5 W2 에서 교체).
 */
describe("firebase client — 지연 초기화", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("설정이 없어도 client 모듈을 불러올 수 있다", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "");

    await expect(import("@/lib/firebase/client")).resolves.toMatchObject({
      getFirebaseAuth: expect.any(Function),
      getFirebaseDb: expect.any(Function),
      getFirebaseStorage: expect.any(Function),
    });
  });

  it("불러오기만 해서는 앱을 만들지 않는다", async () => {
    await import("@/lib/firebase/client");
    await import("@/lib/firebase/storage");
    await import("@/features/admin-maintenance/_lib/find-orphan-article-images");

    expect(getApps()).toHaveLength(0);
  });
});
