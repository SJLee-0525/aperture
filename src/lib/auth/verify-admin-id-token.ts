type Fetcher = typeof fetch;

type LookupResponse = {
  users?: Array<{ localId?: string }>;
};

/**
 * Firebase Auth REST가 ID token의 서명·만료·프로젝트를 검증한 결과로 관리자 UID를 확인한다.
 * 웹 API 키와 관리자 UID는 비밀이 아니며, 권한 증명은 검증된 ID token이 담당한다.
 */
const verifyAdminIdToken = async (idToken: string, fetcher: Fetcher = fetch): Promise<boolean> => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const adminUid = process.env.NEXT_PUBLIC_ADMIN_UID;
  if (!idToken || !apiKey || !adminUid) return false;

  try {
    const response = await fetcher(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
        cache: "no-store",
      },
    );
    if (!response.ok) return false;

    const payload = (await response.json()) as LookupResponse;
    return payload.users?.[0]?.localId === adminUid;
  } catch {
    return false;
  }
};

export { verifyAdminIdToken };
