import configuredTargets from "../config/performance-targets.json";

// `/`는 방문자의 언어 설정에 따라 목적지가 달라진다. 반복 측정은 언어가 고정된 경로만 사용한다.
const TARGET_PATHS = {
  "dev-projects": "/ko/dev/projects",
  "dev-articles": "/ko/dev/articles",
  dev: "/ko/dev",
  "dev-career": "/ko/dev/career",
  photo: "/ko/photo",
  "photo-about": "/ko/photo/about",
  "photo-albums": "/ko/photo/albums",
  "photo-map": "/ko/photo/map",
  music: "/ko/music",
  "music-media": "/ko/music/media",
  home: "/ko",
  contact: "/ko/contact",
} as const;

type PerformanceTargetId = keyof typeof TARGET_PATHS;
type PerformanceTargetPath = (typeof TARGET_PATHS)[PerformanceTargetId];
type PerformanceTarget = { id: PerformanceTargetId; path: PerformanceTargetPath };

/**
 * id와 path를 각각 확인하면 짝이 어긋난 설정이 통과한다.
 * 이 함수의 목적이 그 실수를 잡는 것이므로 id가 지정하는 경로와 같은지를 본다.
 */
const isPerformanceTarget = (value: { id: string; path: string }): value is PerformanceTarget =>
  value.id in TARGET_PATHS && TARGET_PATHS[value.id as PerformanceTargetId] === value.path;

const assertPerformanceTargets = (
  targets: ReadonlyArray<{ id: string; path: string }>,
): readonly PerformanceTarget[] => {
  if (!targets.every(isPerformanceTarget)) {
    throw new Error("config/performance-targets.json contains an unsupported target");
  }
  return targets;
};

const PERFORMANCE_TARGETS: readonly PerformanceTarget[] =
  assertPerformanceTargets(configuredTargets);

export { assertPerformanceTargets, PERFORMANCE_TARGETS };
