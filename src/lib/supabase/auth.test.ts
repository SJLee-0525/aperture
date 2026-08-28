import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(async () => ({ error: null })),
  getSession: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
      getSession: mocks.getSession,
    },
  }),
}));

import {
  ADMIN_DEV_ARTICLE_DRAFT_KEY_PREFIX,
  ADMIN_FORM_DRAFT_KEY_PREFIX,
  SESSION_STORAGE_KEYS,
  STORAGE_KEYS,
} from "@/constants/storage-keys";
import { getAdminAccessToken, signIn, signOutAdmin } from "@/lib/supabase/auth";

/** 지운 키만 기록하는 저장소 대역. */
const fakeStorage = (entries: string[]) => {
  const keys = [...entries];
  return {
    removed: [] as string[],
    get length() {
      return keys.length;
    },
    key: (index: number) => keys[index] ?? null,
    removeItem(key: string) {
      this.removed.push(key);
    },
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("로그인 오류 문구", () => {
  // 로그인 화면이 보여 주는 문구는 전부 여기서 정해진다. 매핑이 비면 사용자는 원인을
  // 알 수 없는 영문 메시지나 기본 문구만 본다.
  it.each([
    ["invalid_credentials", "이메일 또는 비밀번호가 올바르지 않습니다."],
    ["validation_failed", "이메일 형식이 올바르지 않습니다."],
    ["email_not_confirmed", "이메일 확인이 완료되지 않은 계정입니다."],
    ["user_banned", "비활성화된 계정입니다."],
    ["over_request_rate_limit", "시도가 너무 많습니다. 잠시 후 다시 시도하세요."],
    ["request_timeout", "네트워크 연결을 확인하세요."],
  ])("%s 는 안내 문구로 바뀐다", async (code, message) => {
    mocks.signInWithPassword.mockResolvedValue({ data: null, error: { code } });

    await expect(signIn("admin@example.com", "pw")).rejects.toThrow(message);
  });

  it("네트워크 실패는 코드가 없어 오류 이름으로 판별한다", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: null,
      error: { name: "AuthRetryableFetchError" },
    });

    await expect(signIn("admin@example.com", "pw")).rejects.toThrow("네트워크 연결을 확인하세요.");
  });

  it("모르는 코드는 일반 문구로 끝난다", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: null, error: { code: "unexpected" } });

    await expect(signIn("admin@example.com", "pw")).rejects.toThrow(
      "로그인에 실패했습니다. 다시 시도하세요.",
    );
  });

  it("성공하면 사용자를 그대로 돌려준다", async () => {
    const user = { id: "u1", app_metadata: { role: "admin" } };
    mocks.signInWithPassword.mockResolvedValue({ data: { user }, error: null });

    await expect(signIn("admin@example.com", "pw")).resolves.toBe(user);
  });
});

describe("로그아웃", () => {
  // 세션만 끊으면 저장하지 않은 글 본문이 브라우저에 남아 공용 브라우저의 다음
  // 사용자가 읽을 수 있다.
  it("편집 중 작업본을 세션과 함께 지운다", async () => {
    const local = fakeStorage([
      `${ADMIN_DEV_ARTICLE_DRAFT_KEY_PREFIX}article-1`,
      `${ADMIN_FORM_DRAFT_KEY_PREFIX}photo-1`,
      "ap-admin-mock-photos",
      "ap-theme",
    ]);
    const session = fakeStorage([]);
    vi.stubGlobal("window", { localStorage: local, sessionStorage: session });

    await signOutAdmin();

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(local.removed).toEqual([
      `${ADMIN_DEV_ARTICLE_DRAFT_KEY_PREFIX}article-1`,
      `${ADMIN_FORM_DRAFT_KEY_PREFIX}photo-1`,
      STORAGE_KEYS.ADMIN_REVALIDATE_FAILURE,
    ]);
    expect(session.removed).toEqual([SESSION_STORAGE_KEYS.NEW_DEV_ARTICLE_ID]);
  });

  it("mock CMS 저장소와 방문자 설정은 남긴다", async () => {
    // 같은 `ap-admin-` 접두사를 mock 저장소 열 개가 공유한다. 접두사로 쓸어내면
    // mock 모드에서 작업한 콘텐츠가 로그아웃 한 번에 사라진다.
    const local = fakeStorage(["ap-admin-mock-photos", "ap-lang-pref-v1"]);
    vi.stubGlobal("window", { localStorage: local, sessionStorage: fakeStorage([]) });

    await signOutAdmin();

    expect(local.removed).not.toContain("ap-admin-mock-photos");
    expect(local.removed).not.toContain("ap-lang-pref-v1");
  });
});

describe("access token", () => {
  it("로그인 전에는 null 이다", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });

    await expect(getAdminAccessToken()).resolves.toBeNull();
  });

  it("세션이 있으면 그 토큰을 돌려준다", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: "jwt" } } });

    await expect(getAdminAccessToken()).resolves.toBe("jwt");
  });
});
