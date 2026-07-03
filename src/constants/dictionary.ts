import type { Lang } from "@/types/lang";

/** UI 라벨 사전 — 콘텐츠가 아닌 정적 UI 문자열. 콘텐츠는 {ko,en} 필드 + pickText. */
type UIDict = {
  workNav: string;
  albumsNav: string;
  mapNav: string;
  aboutNav: string;
  // 통합 셸 · 섹션 네비 (mega-menu / 모바일 탭)
  sectionPhoto: string;
  sectionMusic: string;
  sectionDev: string;
  musicWorksNav: string;
  musicMediaNav: string;
  musicCareerNav: string; // 경력 탭 + 경력(experience) 타임라인 라벨
  musicEducationLabel: string; // 학력
  musicAwardsNav: string; // 수상 (경력 페이지 안 섹션 라벨)
  musicRepertoireLabel: string; // 소개 페이지 컬럼 — 레퍼토리
  musicVenuesLabel: string; // 소개 페이지 컬럼 — 무대
  musicGenresLabel: string; // 소개 페이지 컬럼 — 장르
  musicContactNav: string;
  // 연락처 페이지 (전역)
  contactNav: string;
  contactLead: string;
  contactName: string;
  contactEmail: string;
  contactMessage: string;
  contactSend: string;
  devAboutNav: string;
  devStackNav: string;
  devProjectsNav: string;
  devCareerNav: string;
  comingSoon: string;
  // 음악 섹션 UI
  musicContactLead: string;
  musicBookingLabel: string;
  socialLabel: string;
  musicBook: string;
  musicProgram: string;
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
    sectionPhoto: "사진",
    sectionMusic: "음악",
    sectionDev: "개발",
    musicWorksNav: "연주",
    musicMediaNav: "영상",
    musicCareerNav: "경력",
    musicEducationLabel: "학력",
    musicAwardsNav: "수상",
    musicRepertoireLabel: "레퍼토리",
    musicVenuesLabel: "무대",
    musicGenresLabel: "장르",
    musicContactNav: "연락처",
    contactNav: "연락",
    contactLead:
      "공연·촬영·개발 어떤 이야기든 좋습니다. 아래 폼으로 메일을 보내거나, 바로 연락해 주세요.",
    contactName: "이름",
    contactEmail: "이메일",
    contactMessage: "메시지",
    contactSend: "메일 보내기",
    devAboutNav: "소개",
    devStackNav: "기술 스택",
    devProjectsNav: "프로젝트",
    devCareerNav: "경력",
    comingSoon: "곧 공개됩니다",
    musicContactLead: "함께 무대를 만들 분을 기다립니다.",
    musicBookingLabel: "공연 문의",
    socialLabel: "소셜",
    musicBook: "예매하기",
    musicProgram: "프로그램",
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
    sectionPhoto: "Photo",
    sectionMusic: "Music",
    sectionDev: "Dev",
    musicWorksNav: "Works",
    musicMediaNav: "Media",
    musicCareerNav: "Career",
    musicEducationLabel: "Education",
    musicAwardsNav: "Awards",
    musicRepertoireLabel: "Repertoire",
    musicVenuesLabel: "Venues",
    musicGenresLabel: "Genres",
    musicContactNav: "Contact",
    contactNav: "Contact",
    contactLead:
      "Performances, shoots, or code — any conversation is welcome. Send a message below, or reach me directly.",
    contactName: "Name",
    contactEmail: "Email",
    contactMessage: "Message",
    contactSend: "Send email",
    devAboutNav: "About",
    devStackNav: "Stack",
    devProjectsNav: "Projects",
    devCareerNav: "Career",
    comingSoon: "Coming soon",
    musicContactLead: "Looking for someone to build the stage together.",
    musicBookingLabel: "Booking",
    socialLabel: "Social",
    musicBook: "Book tickets",
    musicProgram: "Programme",
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
