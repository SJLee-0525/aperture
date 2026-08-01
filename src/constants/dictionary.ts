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
  aboutShowMore: string;
  aboutShowLess: string;
  // 연락처 페이지 (전역)
  contactNav: string;
  contactName: string;
  contactEmail: string;
  contactMessage: string;
  contactResizeMessage: string;
  contactSend: string;
  contactSending: string;
  contactSent: string;
  contactSendError: string;
  devStackNav: string;
  devProjectsNav: string;
  devCareerNav: string;
  devEducationLabel: string;
  devAwardsLabel: string;
  devAwardProjectLink: string;
  devOverviewLabel: string;
  devPeriodLabel: string;
  devPositionLabel: string;
  devFeaturesLabel: string;
  devRolesLabel: string;
  devTroubleLabel: string;
  devTroubleProblemLabel: string;
  devTroubleSolutionLabel: string;
  devTroubleResultLabel: string;
  devAchievementsLabel: string;
  devStackLabel: string;
  devTechLabel: string;
  devFieldLabel: string;
  devProjectLoadingLabel: string;
  devProjectLoadError: string;
  // 소개 페이지 통계 라벨 (사진·음악·개발)
  statPhotos: string;
  statAlbums: string;
  statLocations: string;
  statCameras: string;
  statWorks: string;
  statAwards: string;
  statVideos: string;
  statStages: string;
  statProjects: string;
  statStack: string;
  statCareer: string;
  statTags: string;
  comingSoon: string;
  // 음악 섹션 UI
  musicBook: string;
  musicProgram: string;
  primaryNavLabel: string;
  menuOpenLabel: string;
  menuCloseLabel: string;
  homeLabel: string;
  closeLabel: string;
  shareLabel: string;
  sharePhotoLabel: string;
  previousImageLabel: string;
  nextImageLabel: string;
  expandPhotoInfoLabel: string;
  collapsePhotoInfoLabel: string;
  photoLoadingLabel: string;
  photoLoadError: string;
  noImageLabel: string;
  languageLabel: string;
  themeLabel: string;
  mobileNavigationLabel: string;
  sectionsLabel: string;
  searchPlaceholder: string;
  searchPrompt: string;
  searchEmpty: string;
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
    aboutShowMore: "더보기",
    aboutShowLess: "접기",
    contactNav: "문의",
    contactName: "이름",
    contactEmail: "이메일",
    contactMessage: "메시지",
    contactResizeMessage: "메시지 입력란 크기 조절",
    contactSend: "메일 보내기",
    contactSending: "보내는 중…",
    contactSent: "메일이 전송되었습니다. 확인 후 회신드릴게요.",
    contactSendError: "전송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    devStackNav: "기술 스택",
    devProjectsNav: "프로젝트",
    devCareerNav: "경력",
    devEducationLabel: "학력",
    devAwardsLabel: "수상",
    devAwardProjectLink: "프로젝트 보기",
    devOverviewLabel: "개요",
    devPeriodLabel: "기간",
    devPositionLabel: "포지션",
    devFeaturesLabel: "주요 기능",
    devRolesLabel: "담당 · 주요 작업",
    devTroubleLabel: "트러블슈팅",
    devTroubleProblemLabel: "문제",
    devTroubleSolutionLabel: "해결",
    devTroubleResultLabel: "결과",
    devAchievementsLabel: "성과",
    devStackLabel: "기술 스택",
    devTechLabel: "사용 기술",
    devFieldLabel: "분야",
    devProjectLoadingLabel: "프로젝트 불러오는 중",
    devProjectLoadError: "프로젝트를 불러오지 못했습니다.",
    statPhotos: "사진",
    statAlbums: "앨범",
    statLocations: "촬영지",
    statCameras: "카메라",
    statWorks: "연주",
    statAwards: "수상",
    statVideos: "영상",
    statStages: "무대",
    statProjects: "프로젝트",
    statStack: "스택",
    statCareer: "경력",
    statTags: "기술 태그",
    comingSoon: "곧 공개됩니다",
    musicBook: "예매하기",
    musicProgram: "프로그램",
    primaryNavLabel: "주요 메뉴",
    menuOpenLabel: "메뉴 열기",
    menuCloseLabel: "메뉴 닫기",
    homeLabel: "이성준 홈",
    closeLabel: "닫기",
    shareLabel: "공유하기",
    sharePhotoLabel: "사진 공유하기",
    previousImageLabel: "이전 이미지",
    nextImageLabel: "다음 이미지",
    expandPhotoInfoLabel: "사진 정보 펼치기",
    collapsePhotoInfoLabel: "사진 정보 접기",
    photoLoadingLabel: "사진 불러오는 중",
    photoLoadError: "사진을 불러오지 못했습니다.",
    noImageLabel: "이미지 없음",
    languageLabel: "언어",
    themeLabel: "테마 전환",
    mobileNavigationLabel: "모바일 내비게이션",
    sectionsLabel: "섹션",
    searchPlaceholder: "검색 · 태그 / 장비 / 장소",
    searchPrompt: "검색어를 입력하세요.",
    searchEmpty: "검색 결과가 없습니다.",
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
    aboutShowMore: "Show more",
    aboutShowLess: "Show less",
    contactNav: "Contact",
    contactName: "Name",
    contactEmail: "Email",
    contactMessage: "Message",
    contactResizeMessage: "Resize message field",
    contactSend: "Send email",
    contactSending: "Sending…",
    contactSent: "Your message has been sent. I'll get back to you soon.",
    contactSendError: "Failed to send. Please try again in a moment.",
    devStackNav: "Stack",
    devProjectsNav: "Projects",
    devCareerNav: "Career",
    devEducationLabel: "Education",
    devAwardsLabel: "Awards",
    devAwardProjectLink: "View project",
    devOverviewLabel: "Overview",
    devPeriodLabel: "Period",
    devPositionLabel: "Position",
    devFeaturesLabel: "Features",
    devRolesLabel: "Role & Work",
    devTroubleLabel: "Troubleshooting",
    devTroubleProblemLabel: "Problem",
    devTroubleSolutionLabel: "Solution",
    devTroubleResultLabel: "Result",
    devAchievementsLabel: "Achievements",
    devStackLabel: "Stack",
    devTechLabel: "Tech Used",
    devFieldLabel: "Fields",
    devProjectLoadingLabel: "Loading project",
    devProjectLoadError: "Couldn’t load the project.",
    statPhotos: "Photos",
    statAlbums: "Albums",
    statLocations: "Locations",
    statCameras: "Cameras",
    statWorks: "Works",
    statAwards: "Awards",
    statVideos: "Videos",
    statStages: "Stages",
    statProjects: "Projects",
    statStack: "Stack",
    statCareer: "Career",
    statTags: "Tags",
    comingSoon: "Coming soon",
    musicBook: "Book tickets",
    musicProgram: "Programme",
    primaryNavLabel: "Primary navigation",
    menuOpenLabel: "Open menu",
    menuCloseLabel: "Close menu",
    homeLabel: "Sungjoon Lee home",
    closeLabel: "Close",
    shareLabel: "Share",
    sharePhotoLabel: "Share photo",
    previousImageLabel: "Previous image",
    nextImageLabel: "Next image",
    expandPhotoInfoLabel: "Expand photo information",
    collapsePhotoInfoLabel: "Collapse photo information",
    photoLoadingLabel: "Loading photo",
    photoLoadError: "Couldn’t load the photo.",
    noImageLabel: "No image",
    languageLabel: "Language",
    themeLabel: "Toggle theme",
    mobileNavigationLabel: "Mobile navigation",
    sectionsLabel: "Sections",
    searchPlaceholder: "Search · tag / gear / place",
    searchPrompt: "Type to search.",
    searchEmpty: "No results found.",
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
