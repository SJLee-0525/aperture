import { describe, expect, it, vi } from "vitest";

import {
  appendRagChunks,
  formatLinkVocabulary,
  formatProfileContext,
  formatProfileReferences,
  renderProfileBlocks,
  resolveReferencesWithRefresh,
  selectProfileBlocks,
} from "@/features/chat/_lib/build-profile-context";

import { MOCK_ALBUMS } from "@/mocks/albums";
import { MOCK_DEV_CONFIG, MOCK_DEV_PROJECTS } from "@/mocks/dev";
import { MOCK_DEV_ARTICLE_TAGS } from "@/mocks/dev-article-tags";
import { MOCK_DEV_ARTICLES } from "@/mocks/dev-articles";
import {
  MOCK_MUSIC_AWARDS,
  MOCK_MUSIC_CONFIG,
  MOCK_MUSIC_MEDIA,
  MOCK_MUSIC_WORKS,
} from "@/mocks/music";
import { MOCK_PHOTOS } from "@/mocks/photos";
import { MOCK_SITE } from "@/mocks/site";

const data = {
  site: MOCK_SITE,
  devConfig: MOCK_DEV_CONFIG,
  devProjects: MOCK_DEV_PROJECTS,
  musicConfig: MOCK_MUSIC_CONFIG,
  musicWorks: MOCK_MUSIC_WORKS,
  musicAwards: MOCK_MUSIC_AWARDS,
  musicMedia: MOCK_MUSIC_MEDIA,
  photos: MOCK_PHOTOS,
  albums: MOCK_ALBUMS,
  articles: MOCK_DEV_ARTICLES.filter(({ published }) => published).map(
    ({ id, slug, title, summary, cover, tags, publishedAt }) => ({
      id,
      slug,
      title,
      summary,
      cover,
      tags,
      publishedAt,
    }),
  ),
  articleTags: MOCK_DEV_ARTICLE_TAGS,
};

/** 블록 배열을 프롬프트에 실리는 문자열로 만든다. 검증은 그 결과를 본다. */
const render = (data: Parameters<typeof formatProfileContext>[0], lang: "ko" | "en") =>
  renderProfileBlocks(formatProfileContext(data, lang));

/** 섹션 필터를 거친 뒤의 문자열. */
const renderSelected = (
  data: Parameters<typeof formatProfileContext>[0],
  lang: "ko" | "en",
  sections: Parameters<typeof selectProfileBlocks>[1],
) => renderProfileBlocks(selectProfileBlocks(formatProfileContext(data, lang), sections));

describe("formatProfileContext", () => {
  it("선택한 언어의 공개 콘텐츠와 실제 내부 경로를 결정적으로 직렬화한다", () => {
    const first = render(data, "ko");
    const second = render(data, "ko");

    expect(first).toBe(second);
    expect(first).toContain("# PROFILE_CONTEXT");
    expect(first).toContain("Name: 이성준");
    expect(first).toContain("url: /dev/projects?project=");
    expect(first).toContain("url: /photo?photo=");
    expect(first).toContain("camera: Sony α7 IV");
    expect(first).toContain("lens: FE 35mm F1.4 GM");
    expect(first).not.toContain("image.url");
    expect(first).not.toContain("fileName");
    expect(first).not.toContain("coords");
  });

  it("published=false 콘텐츠는 문맥에 포함하지 않는다", () => {
    const privateProject = {
      ...MOCK_DEV_PROJECTS[0],
      id: "private-project",
      title: { ko: "비공개 프로젝트", en: "Private project" },
      published: false,
    };
    const context = render({ ...data, devProjects: [...MOCK_DEV_PROJECTS, privateProject] }, "ko");

    expect(context).not.toContain("비공개 프로젝트");
    expect(context).not.toContain("private-project");
  });

  /**
   * bio·landingLead·heroLead·intro 는 관리자 폼의 multiline textarea 다. 문단을 나눈
   * 값에 블록 구분자가 그대로 들어가면, 문자열 split 에 기대는 섹션 필터가 뒷조각을
   * 통째로 버려 챗봇이 연락처나 프로젝트 목록을 모른다고 답한다.
   */
  it("관리자가 문단을 나눈 값이 섹션을 쪼개지 않는다", () => {
    const paragraphed = {
      ...data,
      site: {
        ...data.site,
        bio: {
          ko: "빛과 정적의 도시 풍경.\n\n의뢰·프린트 문의는 언제나 환영합니다.",
          en: "City light.\n\nInquiries welcome.",
        },
      },
      devConfig: {
        ...data.devConfig,
        heroLead: { ko: "첫 문단.\n\n둘째 문단.", en: "First.\n\nSecond." },
      },
    };

    const profileOnly = renderSelected(paragraphed, "ko", ["profile"]);
    const developmentOnly = renderSelected(paragraphed, "ko", ["development"]);

    // Profile 섹션의 뒷부분(연락 경로·공개 링크)이 살아남는다.
    expect(profileOnly).toContain("Contact page:");
    // 값의 개행은 공백으로 눌러 담아 한 줄 = 한 항목 형식을 지킨다.
    expect(profileOnly).toContain("의뢰·프린트 문의는 언제나 환영합니다.");
    expect(profileOnly).not.toMatch(/Photography bio:.*\n\n/);
    // Development 섹션도 Introduction 뒤가 잘리지 않는다.
    expect(developmentOnly).toContain("## Development");
    expect(developmentOnly).toContain("Project:");
  });

  it("영어 문맥은 영어 필드를 선택한다", () => {
    const context = render(data, "en");

    expect(context).toContain("Name: Sungjoon Lee");
    expect(context).toContain("Photography bio: Quiet light in the city.");
  });

  it("선택한 프로필 섹션만 모델 문맥에 남긴다", () => {
    const context = renderSelected(data, "ko", ["profile", "photography"]);

    expect(context).toContain("## Profile");
    expect(context).toContain("## Photography");
    expect(context).not.toContain("## Development");
    expect(context).not.toContain("## Music");
  });

  it("사진·연주·프로젝트를 기존 모달 딥링크 카드로 투영한다", () => {
    const references = formatProfileReferences(data, "ko");

    expect(references.find(({ type }) => type === "photo")).toMatchObject({
      href: expect.stringContaining("/photo?photo="),
      image: expect.objectContaining({ url: expect.any(String) }),
    });
    expect(references.find(({ type }) => type === "music")).toMatchObject({
      href: expect.stringContaining("/music?work="),
    });
    expect(references.find(({ type }) => type === "project")).toMatchObject({
      href: expect.stringContaining("/dev/projects?project="),
    });
  });

  it("개발 블록에 글 목록을 넣되 본문은 넣지 않는다", () => {
    const context = render(data, "ko");
    const article = data.articles[0];

    expect(context).toContain(`Article: ${article.title.ko}`);
    // 모델이 참조 카드를 고르려면 경로를 볼 수 있어야 한다.
    expect(context).toContain(`url: /dev/articles/${article.slug}`);
    // 태그는 id 가 아니라 현재 언어 라벨로 읽힌다.
    expect(context).toContain("tags: Next.js");
    expect(context).not.toContain(article.summary.en);
  });

  it("글 줄에 참조 카드 조회에 쓰는 문서 ID 를 함께 적는다", () => {
    // 글 주소는 slug 라 다른 섹션과 달리 url 만으로는 모델이 문서 ID 를 알 수 없다.
    // ID 가 없으면 `resolveReferencesWithRefresh` 가 요청을 못 찾아 카드를 조용히 버린다.
    // 운영 데이터의 문서 ID 는 Firestore 자동 ID 라 slug 와 다르다.
    const withFirestoreId = {
      ...data,
      articles: [{ ...data.articles[0], id: "9rhrRuIfN0eREKKOId77", slug: "serverless-portfolio" }],
    };
    const context = render(withFirestoreId, "ko");
    const reference = formatProfileReferences(withFirestoreId, "ko").find(
      ({ type }) => type === "article",
    );

    expect(reference?.id).toBe("9rhrRuIfN0eREKKOId77");
    expect(context).toContain("id: 9rhrRuIfN0eREKKOId77");
    expect(context).toContain("url: /dev/articles/serverless-portfolio");
  });

  it("글이 늘어도 문맥에는 최근 12건까지만 싣고 참조 카드는 전부 유지한다", () => {
    const many = Array.from({ length: 15 }, (_, index) => ({
      ...data.articles[0],
      id: `many-${index}`,
      slug: `many-${index}`,
      title: { ko: `글 ${index}`, en: `Article ${index}` },
    }));
    const grown = { ...data, articles: many };

    const context = render(grown, "ko");
    const references = formatProfileReferences(grown, "ko");

    expect(context).toContain("url: /dev/articles/many-11");
    expect(context).not.toContain("url: /dev/articles/many-12");
    expect(references.filter(({ type }) => type === "article")).toHaveLength(15);
  });

  it("블로그 글 카드에 발행일과 요약을 한 줄로 담고 상세 경로를 준다", () => {
    const references = formatProfileReferences(data, "ko");
    const article = references.find(({ type }) => type === "article");

    expect(article).toBeDefined();
    expect(article?.href).toBe(`/dev/articles/${data.articles[0].slug}`);
    expect(article?.subtitle).toMatch(/^\d{4}\.\d{2}\.\d{2} · /);
  });
});

describe("formatLinkVocabulary", () => {
  it("통제 태그 사전과 공개 사진 파생 카메라·id를 담는다", () => {
    const vocabulary = formatLinkVocabulary(data);

    expect(vocabulary.tags).toBe(data.site.tags);
    expect(vocabulary.cameras).toContain("Sony α7 IV");
    // dedupe — 같은 카메라가 여러 사진에 있어도 한 번만.
    expect(new Set(vocabulary.cameras).size).toBe(vocabulary.cameras.length);
    expect(vocabulary.photoIds).toContain("p01");
  });

  it("published=false 사진과 빈 카메라 문자열은 제외한다", () => {
    const vocabulary = formatLinkVocabulary({
      ...data,
      photos: [
        { ...data.photos[0], id: "no-camera", camera: "  " },
        { ...data.photos[1], id: "private", published: false },
      ],
    });

    expect(vocabulary.cameras).toEqual([]);
    expect(vocabulary.photoIds).toEqual(["no-camera"]);
  });
});

describe("appendRagChunks", () => {
  const chunk = {
    id: "musicAward:award-1:0",
    section: "music" as const,
    sourceType: "musicAward",
    sourceId: "award-1",
    chunkKey: "0",
    text: "2024 우수상 수상",
    embeddingModel: "text-embedding-3-small@512",
    published: true,
  };

  it("벡터 검색 청크를 섹션 요약 아래에 덧붙이고 요약은 유지한다", () => {
    const base = selectProfileBlocks(formatProfileContext(data, "ko"), [
      "profile",
      "development",
      "music",
    ]);
    const merged = renderProfileBlocks(appendRagChunks(base, [chunk]));

    expect(merged).toContain("## Development");
    expect(merged).toContain("## Music");
    expect(merged).toContain("## Highly Relevant Portfolio Context (Vector Search)");
    expect(merged).toContain("[musicAward:award-1] 2024 우수상 수상");
    expect(merged.indexOf("## Music")).toBeLessThan(merged.indexOf("Vector Search"));
  });

  it("검색 청크가 없으면 기존 문맥을 그대로 반환한다", () => {
    const blocks = formatProfileContext(data, "ko");

    expect(appendRagChunks(blocks, [])).toBe(blocks);
  });
});

describe("resolveReferencesWithRefresh", () => {
  it("요청한 항목이 캐시에서 누락되면 최신 공개 reference로 복구한다", async () => {
    const freshPhoto = {
      type: "photo" as const,
      id: "dokdo-photo",
      title: "LSJ_3112",
      subtitle: "독도",
      href: "/photo?photo=dokdo-photo",
      image: null,
    };
    const loadFreshReferences = vi.fn().mockResolvedValue([freshPhoto]);

    await expect(
      resolveReferencesWithRefresh([{ type: "photo", id: "dokdo-photo" }], [], loadFreshReferences),
    ).resolves.toEqual([freshPhoto]);
    expect(loadFreshReferences).toHaveBeenCalledOnce();
  });

  it("캐시가 요청한 항목을 포함하면 최신 데이터를 다시 읽지 않는다", async () => {
    const cachedProject = {
      type: "project" as const,
      id: "project-1",
      title: "Project",
      subtitle: "Summary",
      href: "/dev/projects?project=project-1",
      image: null,
    };
    const loadFreshReferences = vi.fn();

    await expect(
      resolveReferencesWithRefresh(
        [{ type: "project", id: "project-1" }],
        [cachedProject],
        loadFreshReferences,
      ),
    ).resolves.toEqual([cachedProject]);
    expect(loadFreshReferences).not.toHaveBeenCalled();
  });

  it("mock reference가 없을 때 live refresh 함수 없이 빈 결과를 유지한다", async () => {
    await expect(
      resolveReferencesWithRefresh([{ type: "photo", id: "live-only-photo" }], []),
    ).resolves.toEqual([]);
  });
});
