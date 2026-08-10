type SentryModule = typeof import("@sentry/nextjs");
type DataCollection = NonNullable<Parameters<SentryModule["init"]>[0]["dataCollection"]>;

/**
 * 오류 진단에 필요하지 않은 Sentry 자동 수집 범주를 전부 끈다.
 *
 * SDK 10.x는 `dataCollection`을 지정하면 생략 필드에 수집 허용 기본값을 적용하므로,
 * 새 필드를 추가할 때도 이 객체에서 명시적으로 검토해야 한다.
 */
const MINIMAL_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: false, response: false },
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  stackFrameVariables: false,
  frameContextLines: 0,
} satisfies DataCollection;

export { MINIMAL_DATA_COLLECTION };
