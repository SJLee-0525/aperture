import type { LocalizedText } from "@/types/localized";

type SearchSection = "photo" | "music" | "dev";

/** 서버(search-documents)가 미리 정규화해 내려주는 대조용 인덱스 — 클라는 재정규화 없이 대조만. */
type SearchIndex = {
  /** 제목(ko+en) 정규화본 — 랭킹 가중 대상 */
  title: string;
  /** 나머지 텍스트(장소·프로그램·태그 등) 정규화본 */
  body: string;
  /** 한글 초성 나열(공백 제거) — 초성 전용 질의("ㅂㅅ")의 대조 대상 */
  choseong: string;
};

/** 공개 도메인 객체를 검색에 필요한 최소로 투영한 문서 — /search 페이지와 자동완성이 공유. */
type SearchDocument = {
  key: string;
  section: SearchSection;
  /**
   * 같은 섹션 안에서 결과를 따로 묶어 보여줄 때 쓴다. 섹션 자체를 나누지 않는 이유는
   * 블로그가 개발 섹션의 콘텐츠이고 액센트·경로도 개발을 따르기 때문이다.
   */
  subsection?: "blog";
  title: LocalizedText;
  index: SearchIndex;
  meta?: LocalizedText;
  metaLabel?: "albums";
  imageUrl?: string;
  href: string;
};

export type { SearchDocument, SearchIndex, SearchSection };
