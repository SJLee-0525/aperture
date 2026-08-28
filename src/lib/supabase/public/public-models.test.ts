import { beforeEach, describe, expect, it, vi } from "vitest";

import { decodeMusicWork } from "@/lib/supabase/decode/music";
import {
  fetchChatDevProjects,
  fetchDevConfig,
  fetchPublishedDevProjects,
} from "@/lib/supabase/public/dev";
import {
  fetchChatMusicAwards,
  fetchChatMusicMedia,
  fetchChatMusicWorks,
  fetchMusicConfig,
  fetchPublishedMusicWorks,
} from "@/lib/supabase/public/music";
import {
  fetchChatAlbums,
  fetchChatPhotos,
  fetchPublishedPhotos,
} from "@/lib/supabase/public/photo";
import { fetchSiteConfig } from "@/lib/supabase/public/site";

/**
 * 정화는 디코더가 아니라 공개 fetcher 뒤에 한 겹으로 붙는다. 관리자 경로는 디코더만 쓴다.
 * `public-sanitize.test.ts` 는 정화 함수 자체를 고정하고, 여기서는 공개 fetcher 가 그
 * 함수를 실제로 통과시키는지를 고정한다. 배선이 빠지면 저장된 `javascript:` 주소가
 * 공개 화면까지 그대로 간다.
 */
const transport = vi.hoisted(() => ({
  selectPublished: vi.fn(),
  selectRows: vi.fn(),
  selectProjectedPublished: vi.fn(),
  fetchRow: vi.fn(),
  fetchRowAsUser: vi.fn(),
}));

vi.mock("@/lib/supabase/public/transport", () => transport);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("공개 fetcher 의 정화 배선", () => {
  it("연주의 실행 가능한 예매 링크는 공개 경로에서만 사라진다", async () => {
    const data = { ticketUrl: "javascript:alert(1)", title: { ko: "독주회", en: "Recital" } };
    transport.selectPublished.mockResolvedValue([{ id: "w1", data }]);

    const [work] = await fetchPublishedMusicWorks();

    expect(work.ticketUrl).toBe("");
    // 같은 행을 관리자 경로의 디코더로 읽으면 원문이 남는다. 정화 위치가 여기임을 고정한다.
    expect(decodeMusicWork("w1", data).ticketUrl).toBe("javascript:alert(1)");
  });

  it("프로젝트 링크는 https 만 남는다", async () => {
    transport.selectPublished.mockResolvedValue([
      {
        id: "p1",
        data: {
          links: [
            { label: "저장소", href: "https://example.com/repo" },
            { label: "실행", href: "javascript:alert(1)" },
            { label: "평문", href: "http://example.com" },
          ],
        },
      },
    ]);

    const [project] = await fetchPublishedDevProjects();

    expect(project.links).toEqual([{ label: "저장소", href: "https://example.com/repo" }]);
  });

  it("사이트 연락 링크는 mailto 를 남긴다", async () => {
    transport.fetchRow.mockResolvedValue({
      links: [
        { label: "메일", href: "mailto:someone@example.com" },
        { label: "실행", href: "javascript:alert(1)" },
      ],
    });

    const config = await fetchSiteConfig();

    expect(config?.links).toEqual([{ label: "메일", href: "mailto:someone@example.com" }]);
  });
});

describe("채팅 투영", () => {
  // 사진 좌표는 EXIF GPS 에서 온 촬영 위치다. 챗 문맥은 LLM 제공자로 나가므로
  // 목록에 좌표가 섞이면 그대로 외부로 나간다.
  it("사진 좌표를 내보내지 않는다", async () => {
    const data = {
      title: { ko: "야경", en: "Night" },
      coords: { lat: 37.5, lng: 127.0 },
      place: { ko: "서울", en: "Seoul" },
    };
    transport.selectPublished.mockResolvedValue([{ id: "p1", data }]);

    const [photo] = await fetchChatPhotos();

    expect("coords" in photo).toBe(false);
    expect(photo.place).toEqual({ ko: "서울", en: "Seoul" });
    // 같은 행을 공개 목록으로 읽으면 좌표가 있다. 지도가 그 값을 쓴다.
    transport.selectPublished.mockResolvedValue([{ id: "p1", data }]);
    const [full] = await fetchPublishedPhotos();
    expect(full.coords).toEqual({ lat: 37.5, lng: 127.0 });
  });
});

describe("채팅 투영이 내보내는 필드", () => {
  // 이 키 집합이 곧 LLM 제공자로 나가는 범위다. 필드를 늘리면 프롬프트 비용과
  // 노출 범위가 함께 늘어나므로 목록을 여기에 고정한다.
  const cases = [
    {
      name: "사진",
      fetch: fetchChatPhotos,
      keys: [
        "camera",
        "exif",
        "id",
        "image",
        "lens",
        "order",
        "place",
        "published",
        "shotAt",
        "tags",
        "title",
      ],
    },
    {
      name: "앨범",
      fetch: fetchChatAlbums,
      keys: ["cover", "id", "order", "published", "subtitle", "title"],
    },
    {
      name: "연주",
      fetch: fetchChatMusicWorks,
      keys: ["id", "order", "performedAt", "poster", "program", "published", "title", "venue"],
    },
    {
      name: "수상",
      fetch: fetchChatMusicAwards,
      keys: ["id", "name", "order", "place", "published", "year"],
    },
    {
      name: "영상",
      fetch: fetchChatMusicMedia,
      keys: ["id", "order", "published", "source", "title"],
    },
    {
      name: "프로젝트",
      fetch: fetchChatDevProjects,
      keys: [
        "achievements",
        "cover",
        "id",
        "order",
        "position",
        "published",
        "summary",
        "techTags",
        "title",
      ],
    },
  ];

  it.each(cases)("$name", async ({ fetch, keys }) => {
    transport.selectPublished.mockResolvedValue([{ id: "x1", data: {} }]);

    const [item] = await fetch();

    expect(Object.keys(item).sort()).toEqual(keys);
  });
});

describe("설정 문서가 없을 때", () => {
  it("세 섹션 설정 모두 null 이다", async () => {
    transport.fetchRow.mockResolvedValue(null);

    await expect(fetchSiteConfig()).resolves.toBeNull();
    await expect(fetchMusicConfig()).resolves.toBeNull();
    await expect(fetchDevConfig()).resolves.toBeNull();
  });
});
