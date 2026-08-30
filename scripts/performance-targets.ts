import configuredTargets from "../config/performance-targets.json";

type PerformanceTarget = {
  id:
    | "dev-projects"
    | "dev-articles"
    | "dev"
    | "dev-career"
    | "photo"
    | "photo-about"
    | "photo-albums"
    | "photo-map"
    | "music"
    | "music-media"
    | "home"
    | "contact";
  path:
    | "/ko/dev/projects"
    | "/ko/dev/articles"
    | "/ko/dev"
    | "/ko/dev/career"
    | "/ko/photo"
    | "/ko/photo/about"
    | "/ko/photo/albums"
    | "/ko/photo/map"
    | "/ko/music"
    | "/ko/music/media"
    | "/ko"
    | "/ko/contact";
};

// `/`는 방문자의 언어 설정에 따라 목적지가 달라진다. 반복 측정은 언어가 고정된 경로만 사용한다.
const isPerformanceTarget = (value: { id: string; path: string }): value is PerformanceTarget =>
  [
    "dev-projects",
    "dev-articles",
    "dev",
    "dev-career",
    "photo",
    "photo-about",
    "photo-albums",
    "photo-map",
    "music",
    "music-media",
    "home",
    "contact",
  ].includes(value.id) &&
  [
    "/ko/dev/projects",
    "/ko/dev/articles",
    "/ko/dev",
    "/ko/dev/career",
    "/ko/photo",
    "/ko/photo/about",
    "/ko/photo/albums",
    "/ko/photo/map",
    "/ko/music",
    "/ko/music/media",
    "/ko",
    "/ko/contact",
  ].includes(value.path);

if (!configuredTargets.every(isPerformanceTarget)) {
  throw new Error("config/performance-targets.json contains an unsupported target");
}

const PERFORMANCE_TARGETS: readonly PerformanceTarget[] = configuredTargets;

export { PERFORMANCE_TARGETS };
