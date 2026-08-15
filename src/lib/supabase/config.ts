/**
 * Supabase 공개 설정 존재 여부. URL과 publishable key 는 공개돼도 안전하다 —
 * 보안 경계는 RLS 가 담당한다 (ADR-0005).
 */
const isSupabaseConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

const supabaseUrl = (): string => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

const supabasePublishableKey = (): string => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export { isSupabaseConfigured, supabasePublishableKey, supabaseUrl };
