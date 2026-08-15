/**
 * Supabase 공개 설정. URL과 publishable key 는 공개돼도 안전하다 —
 * 보안 경계는 RLS 가 담당한다 (ADR-0005).
 */

/**
 * env 의 Supabase URL 을 origin 으로 정규화한다.
 * 소비자(storage-source-url, article-body-storage-paths)가 이 값과 정확 문자열
 * 비교를 하므로 trailing slash·공백이 남으면 정상 URL 전체가 거부된다.
 * credentials 가 든 URL 은 설정 실수로 보고 비활성 처리한다. protocol·port 는
 * 제한하지 않는다 — 로컬 스택(http://127.0.0.1:54321)을 막지 않기 위해서다.
 */
const supabaseUrl = (): string => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.username || url.password) return "";
    return url.origin;
  } catch {
    return "";
  }
};

const supabasePublishableKey = (): string => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

const isSupabaseConfigured = (): boolean => Boolean(supabaseUrl() && supabasePublishableKey());

export { isSupabaseConfigured, supabasePublishableKey, supabaseUrl };
