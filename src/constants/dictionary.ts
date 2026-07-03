import type { Lang } from "@/types/lang";

/** UI 라벨 사전 — 콘텐츠가 아닌 정적 UI 문자열. 콘텐츠는 {ko,en} 필드 + pickText. */
type UIDict = {
  workNav: string;
  albumsNav: string;
  mapNav: string;
  aboutNav: string;
  searchPlaceholder: string;
  allTag: string;
  filterLabel: string;
  cameraLabel: string;
  focalLabel: string;
  resetLabel: string;
  emptyResults: string;
  emptyAlbums: string;
  viewMasonry: string;
  viewSquare: string;
  // EXIF 라벨 (상세 패널)
  exifAperture: string;
  exifShutter: string;
  exifIso: string;
  exifEv: string;
  exifWb: string;
  exifMetering: string;
  exifFlash: string;
  exifSize: string;
  exifShotAt: string;
  exifFile: string;
  // 소개 · 지도
  lensLabel: string;
  regionsLabel: string;
  locationsLabel: string;
  // 에러 · 404
  errorLabel: string;
  errorTitle: string;
  errorBody: string;
  errorBody2: string;
  errorRetry: string;
  errorDigest: string;
  notFoundTitle: string;
  notFoundBody: string;
  notFoundBody2: string;
  backHome: string;
};

const DICTIONARY: Record<Lang, UIDict> = {
  ko: {
    workNav: "작업",
    albumsNav: "앨범",
    mapNav: "지도",
    aboutNav: "소개",
    searchPlaceholder: "검색 · 태그 / 장비 / 장소",
    allTag: "전체",
    filterLabel: "필터",
    cameraLabel: "카메라",
    focalLabel: "초점거리",
    resetLabel: "초기화",
    emptyResults: "검색 결과가 없습니다",
    emptyAlbums: "아직 등록된 앨범이 없습니다",
    viewMasonry: "메이슨리",
    viewSquare: "정사각",
    exifAperture: "조리개",
    exifShutter: "셔터",
    exifIso: "감도",
    exifEv: "노출보정",
    exifWb: "화이트밸런스",
    exifMetering: "측광",
    exifFlash: "플래시",
    exifSize: "크기",
    exifShotAt: "촬영일시",
    exifFile: "파일",
    lensLabel: "렌즈",
    regionsLabel: "활동 지역",
    locationsLabel: "촬영 위치",
    errorLabel: "오류",
    errorTitle: "문제가 발생했습니다",
    errorBody: "예기치 못한 오류로 페이지를 표시할 수 없습니다.",
    errorBody2: "잠시 후 다시 시도해 주세요.",
    errorRetry: "다시 시도",
    errorDigest: "오류 코드",
    notFoundTitle: "페이지를 찾을 수 없습니다",
    notFoundBody: "요청하신 페이지가 없거나 이동되었습니다.",
    notFoundBody2: "주소를 확인하거나 홈으로 돌아가세요.",
    backHome: "홈으로",
  },
  en: {
    workNav: "Work",
    albumsNav: "Albums",
    mapNav: "Map",
    aboutNav: "About",
    searchPlaceholder: "Search · tag / gear / place",
    allTag: "All",
    filterLabel: "Filter",
    cameraLabel: "Camera",
    focalLabel: "Focal length",
    resetLabel: "Reset",
    emptyResults: "No results found",
    emptyAlbums: "No albums yet",
    viewMasonry: "Masonry",
    viewSquare: "Square",
    exifAperture: "Aperture",
    exifShutter: "Shutter",
    exifIso: "ISO",
    exifEv: "Exposure",
    exifWb: "White balance",
    exifMetering: "Metering",
    exifFlash: "Flash",
    exifSize: "Size",
    exifShotAt: "Captured",
    exifFile: "File",
    lensLabel: "Lens",
    regionsLabel: "Regions",
    locationsLabel: "Locations",
    errorLabel: "Error",
    errorTitle: "Something went wrong",
    errorBody: "An unexpected error occurred and the page can’t be displayed.",
    errorBody2: "Please try again.",
    errorRetry: "Try again",
    errorDigest: "Error code",
    notFoundTitle: "Page not found",
    notFoundBody: "The page you’re looking for doesn’t exist or has moved.",
    notFoundBody2: "Check the URL or head back home.",
    backHome: "Back to home",
  },
};

export { DICTIONARY };
export type { UIDict };
