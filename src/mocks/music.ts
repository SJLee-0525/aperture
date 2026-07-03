import type { MusicAward, MusicConfig, MusicMedia, MusicWork } from "@/types/music";

/** 빈 포스터 — mock 은 이미지 없음(WorkPoster 가 플레이스홀더 렌더). */
const NO_POSTER = { url: "", path: "", w: 0, h: 0 };

/**
 * 음악 섹션 mock — design/ver_2/music.js 이식(ko) + en 번역.
 * Firebase 미설정(로컬 dev·데모)에서만 폴백으로 쓰인다. 실운영 데이터는 관리자 CMS(Phase B2)로 입력.
 */
const MOCK_MUSIC_WORKS: MusicWork[] = [
  {
    id: "winterreise",
    title: { ko: "겨울 나그네", en: "Winterreise" },
    subtitle: { ko: "슈베르트 · D.911", en: "Schubert · D.911" },
    performedAt: new Date("2026-03-14T19:30:00+09:00"),
    time: "19:30",
    venue: { ko: "예술의전당 콘서트홀", en: "Seoul Arts Center Concert Hall" },
    category: { ko: "리사이틀", en: "Recital" },
    program: [
      "Gute Nacht",
      "Die Wetterfahne",
      "Gefrorne Tränen",
      "Erstarrung",
      "Der Lindenbaum",
      "Wasserflut",
    ],
    description: {
      ko: "슈베르트 겨울 나그네 전곡. 24개의 가곡을 하나의 긴 호흡으로.",
      en: "Schubert's complete Winterreise — twenty-four songs in one long breath.",
    },
    poster: NO_POSTER,
    ticketUrl: "#",
    order: 0,
    published: true,
  },
  {
    id: "chopin-recital",
    title: { ko: "쇼팽 리사이틀", en: "Chopin Recital" },
    subtitle: { ko: "쇼팽", en: "Chopin" },
    performedAt: new Date("2025-11-02T17:00:00+09:00"),
    time: "17:00",
    venue: { ko: "롯데콘서트홀", en: "Lotte Concert Hall" },
    category: { ko: "리사이틀", en: "Recital" },
    program: [
      "Ballade No.1 in G minor",
      "Nocturne Op.27 No.2",
      "Scherzo No.2",
      "Polonaise-Fantaisie",
    ],
    description: {
      ko: "쇼팽의 발라드와 스케르초를 중심으로 한 프로그램.",
      en: "A programme centred on Chopin's ballades and scherzos.",
    },
    poster: NO_POSTER,
    ticketUrl: "#",
    order: 1,
    published: true,
  },
  {
    id: "rachmaninoff-no2",
    title: { ko: "라흐마니노프 협주곡 2번", en: "Rachmaninoff Concerto No.2" },
    subtitle: { ko: "KBS 교향악단 협연", en: "with KBS Symphony" },
    performedAt: new Date("2025-06-20T20:00:00+09:00"),
    time: "20:00",
    venue: { ko: "세종문화회관 대극장", en: "Sejong Grand Theater" },
    category: { ko: "협연", en: "Concerto" },
    program: ["Piano Concerto No.2 in C minor, Op.18"],
    description: {
      ko: "라흐마니노프 피아노 협주곡 2번. KBS 교향악단과 협연.",
      en: "Rachmaninoff's Piano Concerto No.2, performed with the KBS Symphony Orchestra.",
    },
    poster: NO_POSTER,
    ticketUrl: "#",
    order: 2,
    published: true,
  },
  {
    id: "schubert-sonatas",
    title: { ko: "슈베르트 소나타", en: "Schubert Sonatas" },
    subtitle: { ko: "슈베르트", en: "Schubert" },
    performedAt: new Date("2025-02-15T19:30:00+09:00"),
    time: "19:30",
    venue: { ko: "금호아트홀 연세", en: "Kumho Art Hall Yonsei" },
    category: { ko: "리사이틀", en: "Recital" },
    program: ["Sonata in A, D.959", "Sonata in B-flat, D.960"],
    description: {
      ko: "슈베르트 후기 소나타 두 곡.",
      en: "Two of Schubert's late sonatas.",
    },
    poster: NO_POSTER,
    ticketUrl: "#",
    order: 3,
    published: true,
  },
  {
    id: "new-year-gala",
    title: { ko: "신년 갈라", en: "New Year Gala" },
    subtitle: { ko: "여러 작곡가", en: "Various" },
    performedAt: new Date("2025-01-01T17:00:00+09:00"),
    time: "17:00",
    venue: { ko: "예술의전당", en: "Seoul Arts Center" },
    category: { ko: "갈라", en: "Gala" },
    program: ["Liszt · Liebestraum No.3", "Debussy · Clair de lune", "Encore Selections"],
    description: { ko: "새해 갈라 콘서트.", en: "A New Year gala concert." },
    poster: NO_POSTER,
    ticketUrl: "#",
    order: 4,
    published: true,
  },
  {
    id: "brahms-schumann",
    title: { ko: "브람스 & 슈만", en: "Brahms & Schumann" },
    subtitle: { ko: "듀오", en: "Duo" },
    performedAt: new Date("2024-10-08T19:30:00+09:00"),
    time: "19:30",
    venue: { ko: "예술의전당 IBK챔버홀", en: "Seoul Arts Center IBK Chamber Hall" },
    category: { ko: "협연", en: "Chamber" },
    program: ["Brahms · Cello Sonata No.1", "Schumann · Fantasiestücke"],
    description: { ko: "첼로와 함께한 듀오 무대.", en: "A duo evening with cello." },
    poster: NO_POSTER,
    ticketUrl: "#",
    order: 5,
    published: true,
  },
  {
    id: "goldberg-variations",
    title: { ko: "골드베르크 변주곡", en: "Goldberg Variations" },
    subtitle: { ko: "J.S. 바흐", en: "J.S. Bach" },
    performedAt: new Date("2024-02-11T19:00:00+09:00"),
    time: "19:00",
    venue: { ko: "LG아트센터", en: "LG Arts Center" },
    category: { ko: "리사이틀", en: "Recital" },
    program: ["Goldberg Variations, BWV 988"],
    description: { ko: "바흐 골드베르크 변주곡 전곡.", en: "Bach's complete Goldberg Variations." },
    poster: NO_POSTER,
    ticketUrl: "#",
    order: 6,
    published: true,
  },
];

const MOCK_MUSIC_AWARDS: MusicAward[] = [
  {
    id: "geneva-2024",
    year: 2024,
    name: {
      ko: "국제 피아노 콩쿠르 — 파이널리스트",
      en: "International Piano Competition — Finalist",
    },
    place: "Geneva, CH",
    description: {
      ko: "세계적 권위의 콩쿠르 결선에 올라 협주곡 라운드를 연주했다.",
      en: "Reached the finals of a world-renowned competition, performing the concerto round.",
    },
    order: 0,
    published: true,
  },
  {
    id: "busoni-2022",
    year: 2022,
    name: { ko: "부조니 콩쿠르 — 2위", en: "Busoni Competition — 2nd Prize" },
    place: "Bolzano, IT",
    description: {
      ko: "부조니 국제 피아노 콩쿠르에서 2위와 함께 청중상을 받았다.",
      en: "Second prize and the audience award at the Busoni International Piano Competition.",
    },
    order: 1,
    published: true,
  },
  {
    id: "leeds-2021",
    year: 2021,
    name: { ko: "리즈 콩쿠르 — 세미파이널", en: "Leeds Competition — Semi-finalist" },
    place: "Leeds, UK",
    description: {
      ko: "리즈 국제 피아노 콩쿠르 준결선에 진출했다.",
      en: "Advanced to the semi-finals of the Leeds International Piano Competition.",
    },
    order: 2,
    published: true,
  },
  {
    id: "seoul-2020",
    year: 2020,
    name: { ko: "서울 음악 콩쿠르 — 1위", en: "Seoul Music Competition — 1st Prize" },
    place: "Seoul, KR",
    description: {
      ko: "국내 최정상 콩쿠르에서 1위를 차지했다.",
      en: "First prize at one of Korea's foremost competitions.",
    },
    order: 3,
    published: true,
  },
  {
    id: "young-musician-2019",
    year: 2019,
    name: { ko: "한국 청년 음악가상", en: "Korea Young Musician Award" },
    place: "Seoul, KR",
    description: {
      ko: "그해 가장 주목받은 신예 음악가에게 주어지는 상을 받았다.",
      en: "Awarded to the year's most notable emerging musician.",
    },
    order: 4,
    published: true,
  },
  {
    id: "yca-2018",
    year: 2018,
    name: { ko: "영 콘서트 아티스트 — 수상", en: "Young Concert Artists — Winner" },
    place: "New York, US",
    description: {
      ko: "국제 오디션을 통해 북미 데뷔 무대 기회를 얻었다.",
      en: "Won a North American debut through the international auditions.",
    },
    order: 5,
    published: true,
  },
];

const MOCK_MUSIC_MEDIA: MusicMedia[] = [
  {
    id: "impromptu",
    title: { ko: "슈베르트 · 즉흥곡 Op.90 No.3", en: "Schubert · Impromptu Op.90 No.3" },
    source: { ko: "예술의전당 실황 · 2025", en: "Live at Seoul Arts Center · 2025" },
    youtubeId: "",
    order: 0,
    published: true,
  },
  {
    id: "prelude",
    title: { ko: "라흐마니노프 · 전주곡 Op.23 No.5", en: "Rachmaninoff · Prélude Op.23 No.5" },
    source: { ko: "스튜디오 세션 · 2024", en: "Studio session · 2024" },
    youtubeId: "",
    order: 1,
    published: true,
  },
  {
    id: "clair-de-lune",
    title: { ko: "드뷔시 · 달빛", en: "Debussy · Clair de lune" },
    source: { ko: "앙코르 · 롯데콘서트홀", en: "Encore · Lotte Concert Hall" },
    youtubeId: "",
    order: 2,
    published: true,
  },
  {
    id: "goldberg-aria",
    title: { ko: "바흐 · 골드베르크, 아리아", en: "Bach · Goldberg, Aria" },
    source: { ko: "LG아트센터 · 2024", en: "LG Arts Center · 2024" },
    youtubeId: "",
    order: 3,
    published: true,
  },
];

const MOCK_MUSIC_CONFIG: MusicConfig = {
  intro: {
    ko: "피아노로 이야기를 짓습니다. 슈베르트의 겨울부터 라흐마니노프의 격정까지, 리사이틀·협연·실내악을 오가며 한 호흡의 무대를 만듭니다. 국내외 콩쿠르 무대에서 연주해 왔고, 지금은 프리랜스 피아니스트로 활동합니다.",
    en: "I tell stories at the piano. From Schubert's winter to Rachmaninoff's fervour — across recitals, concertos, and chamber music, shaped into a single breath. I've played on competition stages at home and abroad, and now work as a freelance pianist.",
  },
  career: [
    {
      period: "2024 —",
      title: {
        ko: "프리랜스 피아니스트 · 리사이틀·협연",
        en: "Freelance pianist · recitals & concertos",
      },
    },
    {
      period: "2023 — 2024",
      title: { ko: "금호아트홀 상주 음악가", en: "Kumho Art Hall Resident Artist" },
    },
    {
      period: "2021 — 2023",
      title: {
        ko: "국내·국제 콩쿠르 입상 및 연주 활동",
        en: "Competition prizes & performances (KR/intl.)",
      },
    },
  ],
  education: [
    {
      period: "2017 — 2023",
      title: { ko: "연세대학교 음악대학 피아노과", en: "Yonsei University — B.Mus. in Piano" },
    },
    {
      period: "2013 — 2016",
      title: { ko: "서울예술고등학교 피아노과", en: "Seoul Arts High School — Piano" },
    },
    {
      period: "2010 — 2013",
      title: { ko: "예원학교 피아노과", en: "Yewon School — Piano" },
    },
  ],
};

export { MOCK_MUSIC_WORKS, MOCK_MUSIC_AWARDS, MOCK_MUSIC_MEDIA, MOCK_MUSIC_CONFIG };
