import { describe, expect, it } from "vitest";

import {
  readDevArticleStore,
  STORE_VERSION,
  writeDevArticleStore,
  type DevArticleStore,
} from "@/features/admin-dev-articles/_lib/local-dev-article-store";

import { STORAGE_KEYS } from "@/constants/storage-keys";

import type { DevArticle } from "@/types/dev-article";

const article = (overrides: Partial<DevArticle> = {}): DevArticle => ({
  id: "a1",
  slug: "serverless-portfolio",
  title: { ko: "서버 없는 포트폴리오", en: "Serverless portfolio" },
  summary: { ko: "요약", en: "Summary" },
  body: "## 제목\n\n본문",
  cover: null,
  coverAlt: null,
  tags: ["nextjs"],
  relatedProjectIds: ["aperture"],
  pinned: false,
  published: true,
  publishedAt: new Date("2026-01-20T10:00:00.000Z"),
  firstPublishedAt: new Date("2026-01-20T10:00:00.000Z"),
  createdAt: new Date("2026-01-19T00:00:00.000Z"),
  updatedAt: new Date("2026-01-21T00:00:00.000Z"),
  ...overrides,
});

/** 테스트용 최소 Storage. localStorage 예외 경로는 별도 스텁으로 확인한다. */
const memoryStorage = (initial: string | null = null) => {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    get raw() {
      return value;
    },
  };
};

const store = (overrides: Partial<DevArticleStore> = {}): DevArticleStore => ({
  articles: [article()],
  tags: [{ id: "nextjs", ko: "Next.js", en: "Next.js" }],
  ...overrides,
});

describe("writeDevArticleStore · readDevArticleStore", () => {
  it("글과 태그를 그대로 왕복시킨다", () => {
    const storage = memoryStorage();

    expect(writeDevArticleStore(storage, store())).toBe(true);
    expect(readDevArticleStore(storage)).toEqual(store());
  });

  it("시각을 Date 로 되돌린다", () => {
    const storage = memoryStorage();
    writeDevArticleStore(storage, store());

    const [restored] = readDevArticleStore(storage)?.articles ?? [];
    expect(restored.publishedAt).toBeInstanceOf(Date);
    expect(restored.createdAt.toISOString()).toBe("2026-01-19T00:00:00.000Z");
  });

  it("발행 시각이 없는 초안도 왕복시킨다", () => {
    const draft = article({
      id: "draft",
      published: false,
      publishedAt: null,
      firstPublishedAt: null,
    });
    const storage = memoryStorage();
    writeDevArticleStore(storage, store({ articles: [draft] }));

    const [restored] = readDevArticleStore(storage)?.articles ?? [];
    expect(restored.publishedAt).toBeNull();
    expect(restored.firstPublishedAt).toBeNull();
  });

  it("저장한 값이 없으면 null 이다", () => {
    expect(readDevArticleStore(memoryStorage())).toBeNull();
  });

  /** 봉투 형식의 원시 JSON — 검증 거부 경로를 만들 때만 직접 조립한다. */
  const envelope = (value: unknown) => JSON.stringify({ version: STORE_VERSION, value });

  it("JSON 이 아니거나 버전이 다르면 통째로 버린다", () => {
    expect(readDevArticleStore(memoryStorage("{"))).toBeNull();
    expect(
      readDevArticleStore(
        memoryStorage(JSON.stringify({ version: 99, value: { articles: [], tags: [] } })),
      ),
    ).toBeNull();
  });

  it("글 하나라도 계약을 어기면 전체를 버린다", () => {
    const broken = envelope({
      articles: [article(), { id: "b2", title: "문자열 제목" }],
      tags: [],
    });

    expect(readDevArticleStore(memoryStorage(broken))).toBeNull();
  });

  it("필수 시각이 깨진 글을 거부한다", () => {
    const broken = envelope({ articles: [{ ...article(), createdAt: "어제" }], tags: [] });

    expect(readDevArticleStore(memoryStorage(broken))).toBeNull();
  });

  it("cover 가 이미지 모양이 아니면 거부한다", () => {
    const broken = envelope({
      articles: [{ ...article(), cover: { url: "https://a" } }],
      tags: [],
    });

    expect(readDevArticleStore(memoryStorage(broken))).toBeNull();
  });

  it("라벨이 없는 태그를 거부한다", () => {
    const broken = envelope({ articles: [], tags: [{ id: "nextjs", ko: "Next.js" }] });

    expect(readDevArticleStore(memoryStorage(broken))).toBeNull();
  });

  it("저장소가 막혀 있으면 읽기는 예외로, 쓰기는 실패로 알린다", () => {
    // 읽기를 null 로 바꾸면 "처음 여는 빈 저장소" 와 구분되지 않아, 저장되지 않는 편집을
    // 정상처럼 이어 가게 된다.
    const blocked = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };

    expect(() => readDevArticleStore(blocked)).toThrow("브라우저 저장소를 읽지 못했습니다");
    expect(writeDevArticleStore(blocked, store())).toBe(false);
  });

  it("약속한 키에 저장한다", () => {
    const keys: string[] = [];
    writeDevArticleStore({ setItem: (key) => keys.push(key) }, store());

    expect(keys).toEqual([STORAGE_KEYS.ADMIN_DEV_ARTICLES]);
  });
});
