/**
 * Sentry 이벤트에 붙일 배포 환경 이름을 결정한다.
 *
 * Vercel 환경값이 있으면 Preview와 Production을 구분한다. 시스템 환경변수 자동 노출이
 * 꺼진 배포에서는 NODE_ENV를 사용해 프로덕션 오류가 development로 분류되지 않게 한다.
 *
 * @param {string | undefined} vercelEnvironment - Vercel이 제공한 배포 환경.
 * @param {string | undefined} nodeEnvironment - 빌드의 NODE_ENV.
 * @returns {string} Sentry environment 태그.
 */
const resolveMonitoringEnvironment = (
  vercelEnvironment: string | undefined,
  nodeEnvironment: string | undefined,
): string => vercelEnvironment || nodeEnvironment || "development";

export { resolveMonitoringEnvironment };
