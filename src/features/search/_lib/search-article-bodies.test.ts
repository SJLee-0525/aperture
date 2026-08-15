import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDevArticles: vi.fn() }));

vi.mock("@/lib/content/dev-articles", () => ({ getDevArticles: mocks.getDevArticles }));

import { searchArticleBodies } from "@/features/search/_lib/search-article-bodies";

// 모듈 캐시가 (id, updatedAt) 버전 키를 쓰므로 fixture 마다 다른 버전을 부여한다 —
// 같은 키로 본문만 바꾸면 이전 테스트의 캐시 본문이 재사용된다.
let fixtureVersion = 0;

const articleOf = (id: string, body: string) => ({
  id,
  slug: id,
  title: { ko: "제목", en: "Title" },
  summary: { ko: "요약", en: "Summary" },
  body,
  cover: null,
  coverAlt: null,
  tags: [],
  relatedProjectIds: [],
  published: true,
  publishedAt: new Date("2026-08-01T00:00:00.000Z"),
  firstPublishedAt: null,
  createdAt: new Date(0),
  updatedAt: new Date((fixtureVersion += 1)),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("searchArticleBodies", () => {
  it("본문 일치 글의 id 와 일치 지점 스니펫을 돌려준다", async () => {
    mocks.getDevArticles.mockResolvedValue([
      articleOf("hit", `# 배경\n\n${"앞부분 설명. ".repeat(20)}수파베이스로 옮긴 이유를 정리한다.`),
      articleOf("miss", "다른 주제의 글."),
    ]);

    const matches = await searchArticleBodies("수파베이스");

    expect(matches.map(({ id }) => id)).toEqual(["hit"]);
    expect(matches[0].snippet).toContain("수파베이스로 옮긴 이유");
    // 일치 지점이 본문 중간이라 앞뒤 절단 말줄임표가 붙는다.
    expect(matches[0].snippet.startsWith("…")).toBe(true);
  });

  it("대소문자와 유니코드 표기 차이를 흡수한다", async () => {
    mocks.getDevArticles.mockResolvedValue([articleOf("a1", "PostgREST 로 공개 읽기를 옮겼다.")]);

    await expect(searchArticleBodies("postgrest")).resolves.toHaveLength(1);
  });

  it("2자 미만 질의는 글을 읽지 않고 빈 결과다", async () => {
    await expect(searchArticleBodies("ㅂ")).resolves.toEqual([]);
    expect(mocks.getDevArticles).not.toHaveBeenCalled();
  });

  it("100자 초과 질의는 글을 읽지 않고 빈 결과다", async () => {
    await expect(searchArticleBodies("가".repeat(101))).resolves.toEqual([]);
    expect(mocks.getDevArticles).not.toHaveBeenCalled();
  });

  it("NFD 본문도 일치 지점 스니펫이 어긋나지 않는다", async () => {
    // NFC 정규화가 길이를 줄이는 본문 — 정규화본 기준으로 대조·절단해야 위치가 맞는다.
    const decomposed = `${"앞 문장. ".repeat(15)}한글 본문 확인`.normalize("NFD");
    mocks.getDevArticles.mockResolvedValue([articleOf("nfd", decomposed)]);

    const [match] = await searchArticleBodies("한글 본문");

    expect(match.snippet).toContain("한글 본문 확인");
  });

  it("케이스 폴딩이 길이를 바꾸는 본문은 서두 스니펫으로 물러난다", async () => {
    // "İ".toLocaleLowerCase() 는 두 코드 유닛으로 늘어나 인덱스 대응이 깨진다.
    mocks.getDevArticles.mockResolvedValue([
      articleOf("fold", "İstanbul 여행 기록과 본문 검색 확인"),
    ]);

    const [match] = await searchArticleBodies("본문 검색");

    expect(match.id).toBe("fold");
    expect(match.snippet.endsWith("…")).toBe(true);
    expect(match.snippet).toContain("İstanbul");
  });

  it("같은 글의 본문이 갱신되면 캐시를 무시하고 새 본문을 대조한다", async () => {
    mocks.getDevArticles.mockResolvedValue([articleOf("v", "첫 번째 버전 본문")]);
    await expect(searchArticleBodies("첫 번째")).resolves.toHaveLength(1);

    mocks.getDevArticles.mockResolvedValue([articleOf("v", "두 번째 버전 본문")]);
    await expect(searchArticleBodies("두 번째")).resolves.toHaveLength(1);
    await expect(searchArticleBodies("첫 번째")).resolves.toEqual([]);
  });

  it("링크 주소는 대조 대상이 아니다 — 평문은 라벨만 남긴다", async () => {
    mocks.getDevArticles.mockResolvedValue([
      articleOf("a1", "[문서](https://supabase.com/docs) 참고."),
    ]);

    await expect(searchArticleBodies("supabase.com")).resolves.toEqual([]);
    await expect(searchArticleBodies("문서")).resolves.toHaveLength(1);
  });
});
