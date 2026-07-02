import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";

import { auth } from "@/lib/firebase/client";

/** Firebase Auth 에러 코드 → 한국어 메시지 (로그인 폼 표시용). */
const AUTH_ERRORS: Record<string, string> = {
  "auth/invalid-email": "이메일 형식이 올바르지 않습니다.",
  "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "auth/user-not-found": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "auth/wrong-password": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "auth/user-disabled": "비활성화된 계정입니다.",
  "auth/too-many-requests": "시도가 너무 많습니다. 잠시 후 다시 시도하세요.",
  "auth/network-request-failed": "네트워크 연결을 확인하세요.",
};

const authErrorMessage = (code: string): string =>
  AUTH_ERRORS[code] ?? "로그인에 실패했습니다. 다시 시도하세요.";

/** 관리자 로그인. 실패 시 한국어 메시지를 담은 Error 를 throw. */
const signIn = async (email: string, password: string): Promise<User> => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";
    throw new Error(authErrorMessage(code));
  }
};

const signOutAdmin = (): Promise<void> => signOut(auth);

/** 인증 상태 구독. 반환값은 구독 해제 함수. */
const subscribeAuth = (callback: (user: User | null) => void): (() => void) =>
  onAuthStateChanged(auth, callback);

export { signIn, signOutAdmin, subscribeAuth };
