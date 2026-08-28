import { supabaseUrl } from "@/lib/supabase/config";

/** media 공개 버킷의 객체 경로 프리픽스. 이 밖의 Storage 엔드포인트는 허용하지 않는다. */
const PUBLIC_OBJECT_PREFIX = "/storage/v1/object/public/media/";

/**
 * 서버가 대신 내려받을 원본 이미지 URL 이 이 프로젝트의 공개 Storage 객체인지 검증한다.
 *
 * 프록시(image-source 라우트)가 임의 호스트로 요청을 보내는 것을 막는 SSRF 방어라
 * 허용 범위를 정확히 좁힌다: env 의 Supabase origin 과 정확히 일치해야 하고,
 * 서명 URL(`/object/sign/`)·이미지 변환(`/render/image/`) 엔드포인트와 다른 버킷,
 * 사용자 정보가 있는 URL 은 전부 거부한다. 포트는 따로 보지 않는다 — origin 비교가
 * 이미 포트를 포함하므로, env 와 같은 포트만 통과하고 로컬 스택도 막히지 않는다.
 * redirect 를 따라간 뒤의 최종 URL 도 같은 함수로 다시 검증해야 한다.
 *
 * @param value 검증할 URL 문자열.
 * @returns 허용된 공개 객체 URL 이면 true.
 */
const isAllowedStorageSourceUrl = (value: string): boolean => {
  const origin = supabaseUrl();
  if (!origin) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  // 포트가 붙은 URL 은 전부 거부한다. 배포 Storage 는 기본 포트만 쓰므로 남는 것은
  // 로컬 스택(`http://127.0.0.1:54321`)뿐이고, 그 환경에서 이 프록시는 항상 400 을 낸다.
  if (url.username || url.password) return false;
  if (url.origin !== origin) return false;
  return url.pathname.startsWith(PUBLIC_OBJECT_PREFIX);
};

export { isAllowedStorageSourceUrl };
