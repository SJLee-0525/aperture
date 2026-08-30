import configuredTargets from "../config/performance-targets.json";

type PerformanceTarget = {
  id: "home" | "photo" | "music" | "dev";
  path: "/ko" | "/ko/photo" | "/ko/music" | "/ko/dev";
};

// `/`는 방문자의 언어 설정에 따라 목적지가 달라진다. 반복 측정은 언어가 고정된 경로만 사용한다.
const isPerformanceTarget = (value: { id: string; path: string }): value is PerformanceTarget =>
  ["home", "photo", "music", "dev"].includes(value.id) &&
  ["/ko", "/ko/photo", "/ko/music", "/ko/dev"].includes(value.path);

if (!configuredTargets.every(isPerformanceTarget)) {
  throw new Error("config/performance-targets.json contains an unsupported target");
}

const PERFORMANCE_TARGETS: readonly PerformanceTarget[] = configuredTargets;

export { PERFORMANCE_TARGETS };
