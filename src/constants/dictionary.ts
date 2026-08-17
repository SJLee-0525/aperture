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
  musicEducationLabel: string;
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
  contactCaptchaRequired: string;
  contactPrivacyNotice: string;
  devProjectsNav: string;
  devCareerNav: string;
  devCareerStackNav: string;
  devStackHeading: string;
  devArticlesNav: string;
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
  devRelatedArticlesLabel: string;
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
  footerSitemapLabel: string;
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
  languagePreferenceNote: string;
  themeLabel: string;
  privacyNav: string;
  termsNav: string;
  accessibilityNav: string;
  cookieSettingsLabel: string;
  analyticsConsentLabel: string;
  analyticsConsentTitle: string;
  analyticsConsentBody: string;
  analyticsConsentAnalyticsLabel: string;
  analyticsConsentAnalyticsBody: string;
  analyticsConsentMonitoringLabel: string;
  analyticsConsentMonitoringBody: string;
  analyticsConsentDetailsLabel: string;
  analyticsConsentSave: string;
  analyticsConsentDenyAll: string;
  mobileNavigationLabel: string;
  sectionsLabel: string;
  searchPlaceholder: string;
  searchSuggestionsLabel: string;
  searchPrompt: string;
  searchEmpty: string;
  searchEmptyChatHint: string;
  // 챗봇 (Ask Sungjoon)
  chatOpenLabel: string;
  chatTitle: string;
  chatCloseLabel: string;
  chatInputLabel: string;
  chatPlaceholder: string;
  chatSendLabel: string;
  chatRetryLabel: string;
  chatContactDraftLabel: string;
  chatScreenNoticePhoto: string;
  chatScreenNoticeWork: string;
  chatScreenNoticeAward: string;
  chatScreenNoticeProject: string;
  chatScreenNoticeArticle: string;
  chatScreenPlaceholderPhoto: string;
  chatScreenPlaceholderWork: string;
  chatScreenPlaceholderAward: string;
  chatScreenPlaceholderProject: string;
  chatScreenPlaceholderArticle: string;
  chatScreenNoticeDismiss: string;
  chatSentContextPhoto: string;
  chatSentContextWork: string;
  chatSentContextAward: string;
  chatSentContextProject: string;
  chatSentContextArticle: string;
  chatReferenceTypePhoto: string;
  chatReferenceTypeMusic: string;
  chatReferenceTypeProject: string;
  chatReferenceTypeArticle: string;
  chatPrivacyNote: string;
  chatSuggestionsLabel: string;
  chatSuggestions: string[];
  chatPreparingLabel: string;
  chatSearchStatuses: string[];
  chatWelcome: string;
  chatErrorFallback: string;
  // 커스텀 스크롤바 aria
  scrollPageLabel: string;
  scrollModalLabel: string;
  scrollListLabel: string;
  allTag: string;
  filterLabel: string;
  cameraLabel: string;
  focalLabel: string;
  resetLabel: string;
  emptyResults: string;
  emptyAlbums: string;
  viewMasonry: string;
  viewSquare: string;
  viewGrid: string;
  viewList: string;
  // 블로그 목록
  articlesEmptyTag: string;
  articlesEmptyAll: string;
  articlesPinned: string;
  articlesAll: string;
  articlePinnedBadge: string;
  articleReadingMinutes: string;
  articleKoreanOnlyNotice: string;
  articleDraftLabel: string;
  articleRelatedProjects: string;
  articleListNav: string;
  articleTableLabel: string;
  articleImageZoomLabel: string;
  tocLabel: string;
  tocOpenLabel: string;
  paginationLabel: string;
  paginationPrev: string;
  paginationNext: string;
  paginationPage: string;
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
    contactCaptchaRequired: "스팸 방지 확인을 완료해 주세요.",
    contactPrivacyNotice: "입력한 이름, 이메일과 메시지는 문의 전달과 회신에 사용됩니다.",
    devProjectsNav: "프로젝트",
    devCareerNav: "경력",
    devCareerStackNav: "경력·기술",
    devStackHeading: "기술",
    devArticlesNav: "블로그",
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
    devRelatedArticlesLabel: "연관 글",
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
    footerSitemapLabel: "사이트맵",
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
    languagePreferenceNote: "선택한 언어를 30일간 기억합니다.",
    themeLabel: "테마 전환",
    privacyNav: "개인정보 처리방침",
    termsNav: "사이트 이용 및 콘텐츠",
    accessibilityNav: "접근성",
    cookieSettingsLabel: "개인정보 및 쿠키 설정",
    analyticsConsentLabel: "선택적 데이터 수집 설정",
    analyticsConsentTitle: "선택적 데이터 수집 설정",
    analyticsConsentBody:
      "아래 항목은 서로 독립적으로 선택할 수 있습니다. 모두 거부해도 사이트의 모든 기능을 이용할 수 있습니다.",
    analyticsConsentAnalyticsLabel: "방문 분석",
    analyticsConsentAnalyticsBody:
      "페이지를 방문하면 방문 페이지와 일반 기기 정보가 HTTPS를 통해 미국의 Google LLC로 전송됩니다. 이용 통계에 사용하며, 이벤트 데이터는 14개월 보관됩니다.",
    analyticsConsentMonitoringLabel: "오류 보고 및 화면 기록",
    analyticsConsentMonitoringBody:
      "오류가 발생하면 오류 정보와 전후 화면 기록이 HTTPS를 통해 {country}의 Sentry, Inc.로 전송되어 30일간 보관됩니다. 입력값과 챗봇 대화는 기록하지 않습니다.",
    analyticsConsentDetailsLabel: "상세 설명",
    analyticsConsentSave: "선택 저장",
    analyticsConsentDenyAll: "모두 거부",
    mobileNavigationLabel: "모바일 내비게이션",
    sectionsLabel: "섹션",
    searchPlaceholder: "검색 · 태그 / 장비 / 장소",
    searchSuggestionsLabel: "추천 결과",
    searchPrompt: "검색어를 입력하세요.",
    searchEmpty: "검색 결과가 없습니다.",
    searchEmptyChatHint: "원하는 결과를 찾지 못했다면 챗봇에게 물어보세요.",
    chatOpenLabel: "챗봇 열기",
    chatTitle: "Ask Sungjoon.",
    chatCloseLabel: "챗봇 닫기",
    chatInputLabel: "메시지",
    chatPlaceholder: "궁금한 내용을 입력하세요…",
    chatSendLabel: "메시지 보내기",
    chatRetryLabel: "다시 시도",
    chatContactDraftLabel: "연락 페이지에서 이어 쓰기",
    chatScreenNoticePhoto: "보고 있는 사진",
    chatScreenNoticeWork: "보고 있는 연주",
    chatScreenNoticeAward: "보고 있는 수상 내역",
    chatScreenNoticeProject: "보고 있는 프로젝트",
    chatScreenNoticeArticle: "보고 있는 글",
    chatScreenPlaceholderPhoto: "이 사진에 대해 물어보세요…",
    chatScreenPlaceholderWork: "이 연주에 대해 물어보세요…",
    chatScreenPlaceholderAward: "이 수상에 대해 물어보세요…",
    chatScreenPlaceholderProject: "이 프로젝트에 대해 물어보세요…",
    chatScreenPlaceholderArticle: "이 글에 대해 물어보세요…",
    chatScreenNoticeDismiss: "이 항목을 답변에서 제외",
    chatSentContextPhoto: "함께 보낸 사진",
    chatSentContextWork: "함께 보낸 연주",
    chatSentContextAward: "함께 보낸 수상 내역",
    chatSentContextProject: "함께 보낸 프로젝트",
    chatSentContextArticle: "함께 보낸 글",
    chatReferenceTypePhoto: "사진",
    chatReferenceTypeMusic: "연주",
    chatReferenceTypeProject: "프로젝트",
    chatReferenceTypeArticle: "글",
    chatPrivacyNote: "민감한 개인정보는 입력하지 마세요.",
    chatSuggestionsLabel: "추천 질문",
    chatSuggestions: [
      "개발 프로젝트를 소개해 줘",
      "사진 작업은 어디서 볼 수 있어?",
      "연락 방법을 알려줘",
    ],
    chatPreparingLabel: "답변 준비 중",
    chatSearchStatuses: [
      "포트폴리오를 펼쳐보는 중…",
      "관련 작업을 찾는 중…",
      "기록 사이를 탐색하는 중…",
      "질문과 가까운 작업을 고르는 중…",
      "답변에 담을 내용을 정리하는 중…",
    ],
    chatWelcome: "안녕하세요. 사진, 음악, 개발 작업에 관해 무엇이든 물어보세요.",
    chatErrorFallback: "답변을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    scrollPageLabel: "페이지 스크롤",
    scrollModalLabel: "모달 스크롤",
    scrollListLabel: "내부 목록 스크롤",
    allTag: "전체",
    filterLabel: "필터",
    cameraLabel: "카메라",
    focalLabel: "초점거리",
    resetLabel: "초기화",
    emptyResults: "검색 결과가 없습니다",
    emptyAlbums: "아직 등록된 앨범이 없습니다",
    viewMasonry: "메이슨리",
    viewSquare: "정사각",
    viewGrid: "그리드",
    viewList: "목록",
    articlesEmptyTag: "이 태그로 발행한 글이 아직 없습니다",
    articlesEmptyAll: "아직 발행한 글이 없습니다",
    articlesPinned: "고정된 글",
    articlesAll: "전체 글",
    articlePinnedBadge: "고정",
    articleReadingMinutes: "{n}분",
    articleKoreanOnlyNotice: "This article is available in Korean only.",
    articleDraftLabel: "초안",
    articleRelatedProjects: "연관 프로젝트",
    articleListNav: "다른 글",
    articleTableLabel: "표",
    articleImageZoomLabel: "크게 보기",
    tocLabel: "목차",
    tocOpenLabel: "목차 열기",
    paginationLabel: "페이지 이동",
    paginationPrev: "이전 페이지",
    paginationNext: "다음 페이지",
    paginationPage: "{n}페이지",
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
    contactCaptchaRequired: "Please complete the spam check.",
    contactPrivacyNotice:
      "Your name, email address, and message are used to deliver and answer your enquiry.",
    devProjectsNav: "Projects",
    devCareerNav: "Career",
    devCareerStackNav: "Career & Stack",
    devStackHeading: "Stack",
    devArticlesNav: "Blog",
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
    devRelatedArticlesLabel: "Related posts",
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
    footerSitemapLabel: "Sitemap",
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
    languagePreferenceNote: "Your language choice is remembered for 30 days.",
    themeLabel: "Toggle theme",
    privacyNav: "Privacy Policy",
    termsNav: "Site use & content",
    accessibilityNav: "Accessibility",
    cookieSettingsLabel: "Privacy & cookie settings",
    analyticsConsentLabel: "Optional data collection settings",
    analyticsConsentTitle: "Optional data collection settings",
    analyticsConsentBody:
      "Choose each item independently. You can use every site feature if you decline both.",
    analyticsConsentAnalyticsLabel: "Visitor analytics",
    analyticsConsentAnalyticsBody:
      "When you visit a page, its address and general device information are sent over HTTPS to Google LLC in the United States. Event data is used for analytics and kept for 14 months.",
    analyticsConsentMonitoringLabel: "Error reporting and screen recording",
    analyticsConsentMonitoringBody:
      "When an error occurs, its details and a recording from around that time are sent over HTTPS to Sentry, Inc. in {country} and kept for 30 days. Inputs and chatbot conversations are not recorded.",
    analyticsConsentDetailsLabel: "Details",
    analyticsConsentSave: "Save choices",
    analyticsConsentDenyAll: "Decline all",
    mobileNavigationLabel: "Mobile navigation",
    sectionsLabel: "Sections",
    searchPlaceholder: "Search · tag / gear / place",
    searchSuggestionsLabel: "Suggestions",
    searchPrompt: "Type to search.",
    searchEmpty: "No results found.",
    searchEmptyChatHint: "If you couldn’t find what you need, try asking the chatbot.",
    chatOpenLabel: "Open chat",
    chatTitle: "Ask Sungjoon.",
    chatCloseLabel: "Close chat",
    chatInputLabel: "Message",
    chatPlaceholder: "Ask about the portfolio…",
    chatSendLabel: "Send message",
    chatRetryLabel: "Try again",
    chatContactDraftLabel: "Continue on the contact page",
    chatScreenNoticePhoto: "Viewing photo",
    chatScreenNoticeWork: "Viewing performance",
    chatScreenNoticeAward: "Viewing award",
    chatScreenNoticeProject: "Viewing project",
    chatScreenNoticeArticle: "Viewing article",
    chatScreenPlaceholderPhoto: "Ask about this photo…",
    chatScreenPlaceholderWork: "Ask about this performance…",
    chatScreenPlaceholderAward: "Ask about this award…",
    chatScreenPlaceholderProject: "Ask about this project…",
    chatScreenPlaceholderArticle: "Ask about this article…",
    chatScreenNoticeDismiss: "Exclude this item from the answer",
    chatSentContextPhoto: "Sent with photo",
    chatSentContextWork: "Sent with performance",
    chatSentContextAward: "Sent with award",
    chatSentContextProject: "Sent with project",
    chatSentContextArticle: "Sent with article",
    chatReferenceTypePhoto: "Photo",
    chatReferenceTypeMusic: "Performance",
    chatReferenceTypeProject: "Project",
    chatReferenceTypeArticle: "Article",
    chatPrivacyNote: "Please don’t share sensitive personal information.",
    chatSuggestionsLabel: "Suggested questions",
    chatSuggestions: [
      "Show me the development projects",
      "Where can I see the photos?",
      "How can I get in touch?",
    ],
    chatPreparingLabel: "Preparing a response",
    chatSearchStatuses: [
      "Opening up the portfolio…",
      "Looking for relevant work…",
      "Exploring the archive…",
      "Picking work that matches your question…",
      "Gathering details for the answer…",
    ],
    chatWelcome: "Hello. Ask me anything about the photography, music, or development work.",
    chatErrorFallback: "The response could not be loaded. Please try again shortly.",
    scrollPageLabel: "Page scroll",
    scrollModalLabel: "Modal scroll",
    scrollListLabel: "List scroll",
    allTag: "All",
    filterLabel: "Filter",
    cameraLabel: "Camera",
    focalLabel: "Focal length",
    resetLabel: "Reset",
    emptyResults: "No results found",
    emptyAlbums: "No albums yet",
    viewMasonry: "Masonry",
    viewSquare: "Square",
    viewGrid: "Grid",
    viewList: "List",
    articlesEmptyTag: "No published articles with this tag yet",
    articlesEmptyAll: "No published articles yet",
    articlesPinned: "Pinned",
    articlesAll: "All articles",
    articlePinnedBadge: "Pinned",
    articleReadingMinutes: "{n} min",
    articleKoreanOnlyNotice: "This article is available in Korean only.",
    articleDraftLabel: "Draft",
    articleRelatedProjects: "Related projects",
    articleListNav: "More articles",
    articleTableLabel: "Table",
    articleImageZoomLabel: "View larger",
    tocLabel: "Contents",
    tocOpenLabel: "Open table of contents",
    paginationLabel: "Pagination",
    paginationPrev: "Previous page",
    paginationNext: "Next page",
    paginationPage: "Page {n}",
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
