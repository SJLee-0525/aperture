import type { SiteConfig } from "@/types/site";
import type { Tag } from "@/types/tag";

/** 태그 사전 — 필터 칩·사진 태그의 단일 출처. 사진은 이 id를 참조한다. */
const TAGS: Tag[] = [
  { id: "night", ko: "야경", en: "Night" },
  { id: "tokyo", ko: "도쿄", en: "Tokyo" },
  { id: "seascape", ko: "시스케이프", en: "Seascape" },
  { id: "street", ko: "스트리트", en: "Street" },
  { id: "seoul", ko: "서울", en: "Seoul" },
  { id: "film", ko: "필름", en: "Film" },
  { id: "landscape", ko: "풍경", en: "Landscape" },
  { id: "fog", ko: "안개", en: "Fog" },
  { id: "bw", ko: "흑백", en: "B&W" },
  { id: "sea", ko: "바다", en: "Sea" },
  { id: "busan", ko: "부산", en: "Busan" },
  { id: "snow", ko: "설경", en: "Snow" },
  { id: "minimal", ko: "미니멀", en: "Minimal" },
  { id: "jeju", ko: "제주", en: "Jeju" },
  { id: "longexposure", ko: "장노출", en: "Long Exposure" },
  { id: "sunset", ko: "노을", en: "Sunset" },
  { id: "rain", ko: "비", en: "Rain" },
];

/** P1 mock 사이트 설정 — bio(ko)는 디자인 원본. links는 관리자가 자유 편집(P2). */
const MOCK_SITE: SiteConfig = {
  name: { ko: "이성준", en: "Sungjoon Lee" },
  bio: {
    ko: "빛과 정적의 도시 풍경. 서울·도쿄·제주에서 장노출과 거리 사진을 찍습니다. 모든 컷에는 촬영 데이터가 함께 기록됩니다. 의뢰·프린트 문의는 언제나 환영합니다.",
    en: "Quiet light in the city. Long exposures and street frames from Seoul, Tokyo, and Jeju — each recorded with its capture data. Commissions and print inquiries always welcome.",
  },
  links: [
    { label: "Instagram", href: "https://instagram.com/" },
    { label: "Email", href: "mailto:hello@example.com" },
  ],
  tags: TAGS,
};

export { MOCK_SITE };
