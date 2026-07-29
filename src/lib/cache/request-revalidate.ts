import { revalidatePublicPages } from "@/lib/cache/revalidate-public";
import { auth } from "@/lib/firebase/client";

/** 연속 저장(드래그 재정렬 = 문서 N개 병렬 쓰기)을 1회 호출로 합치는 지연. */
const DEBOUNCE_MS = 300;

let timer: ReturnType<typeof setTimeout> | null = null;

const revalidateAsCurrentAdmin = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error("관리자 인증이 필요합니다.");
  const idToken = await user.getIdToken();
  await revalidatePublicPages(idToken);
};

/**
 * 관리자 쓰기 성공 직후 공개 페이지 ISR 재검증을 요청 — fire-and-forget.
 * 저장은 이미 Firestore 에 반영된 뒤라, 재검증 실패는 "최대 revalidate 주기만큼 늦게 보임"일 뿐
 * 데이터 유실이 아니다 → 저장 UX 를 막지 않고 실패는 경고 로그만 남긴다.
 */
const requestPublicRevalidate = (): void => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    revalidateAsCurrentAdmin().catch((error) => {
      console.warn("[cache] 공개 페이지 재검증 실패 — ISR 주기 후 자동 갱신", error);
    });
  }, DEBOUNCE_MS);
};

export { requestPublicRevalidate };
