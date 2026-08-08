import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchChatDevProjects } from "@/lib/firebase/public/dev";
import { fetchChatPhotos, fetchPublishedPhotos } from "@/lib/firebase/public/photo";
import { fetchSiteConfig } from "@/lib/firebase/public/site";

type RestValue = Record<string, unknown>;

/**
 * @param {string} value 문자열 값.
 * @returns {RestValue} Firestore REST 문자열 표현.
 */
const string = (value: string): RestValue => ({ stringValue: value });
/**
 * @param {number} value 정수 값.
 * @returns {RestValue} Firestore REST 정수 표현.
 */
const integer = (value: number): RestValue => ({ integerValue: String(value) });
/**
 * @param {boolean} value 논리 값.
 * @returns {RestValue} Firestore REST 논리 표현.
 */
const bool = (value: boolean): RestValue => ({ booleanValue: value });
/**
 * @param {string} value ISO 날짜 문자열.
 * @returns {RestValue} Firestore REST 타임스탬프 표현.
 */
const timestamp = (value: string): RestValue => ({ timestampValue: value });
/**
 * @param {Record<string, RestValue>} fields 중첩 필드.
 * @returns {RestValue} Firestore REST 맵 표현.
 */
const map = (fields: Record<string, RestValue>): RestValue => ({ mapValue: { fields } });
/**
 * @param {RestValue[]} values 배열 원소.
 * @returns {RestValue} Firestore REST 배열 표현.
 */
const array = (values: RestValue[]): RestValue => ({ arrayValue: { values } });

/**
 * fetch 모킹에 사용할 JSON 응답을 만든다.
 *
 * @param {unknown} body 직렬화할 응답 본문.
 * @param {number} [status=200] HTTP 상태 코드.
 * @returns {Response} JSON 콘텐츠 타입을 가진 테스트 응답.
 */
const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Firestore REST decoding", () => {
  it("챗봇 조회는 카드 대표 이미지 외의 무거운 필드를 projection에서 제외한다", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await fetchChatPhotos();
    await fetchChatDevProjects();

    const photoQuery = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string).structuredQuery;
    const projectQuery = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string).structuredQuery;
    const photoFields = photoQuery.select.fields.map(
      ({ fieldPath }: { fieldPath: string }) => fieldPath,
    );
    const projectFields = projectQuery.select.fields.map(
      ({ fieldPath }: { fieldPath: string }) => fieldPath,
    );

    expect(photoFields).toEqual([
      "title",
      "camera",
      "lens",
      "place",
      "tags",
      "image",
      "order",
      "published",
    ]);
    expect(photoFields).not.toContain("exif");
    expect(projectFields).toEqual([
      "title",
      "summary",
      "position",
      "techTags",
      "cover",
      "order",
      "published",
    ]);
    expect(projectFields).not.toContain("images");
  });

  it("공개 목록 조회를 컬렉션 태그로 1시간 공유 캐시한다", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await fetchPublishedPhotos();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(":runQuery"),
      expect.objectContaining({
        next: {
          revalidate: 3_600,
          tags: ["firestore:photos"],
        },
      }),
    );
  });

  it("사진의 중첩 값과 timestamp를 디코딩하고 누락 EXIF는 기본값으로 채운다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse([
          {
            document: {
              name: "projects/demo/databases/(default)/documents/photos/photo-1",
              fields: {
                title: map({ ko: string("새벽"), en: string("Dawn") }),
                shotAt: timestamp("2026-07-01T01:02:03.000Z"),
                camera: string("Camera"),
                lens: string("Lens"),
                exif: map({ aperture: string("f/2.8"), iso: string("400") }),
                dimensions: map({ w: integer(2048), h: integer(1365) }),
                aspectRatio: { doubleValue: 1.5 },
                place: map({ ko: string("서울"), en: string("Seoul") }),
                coords: map({ lat: { doubleValue: 37.5 }, lng: { doubleValue: 127 } }),
                tags: array([string("night"), string("city")]),
                image: map({
                  url: string("https://example.com/photo.webp"),
                  path: string("photos/photo.webp"),
                  w: integer(2048),
                  h: integer(1365),
                }),
                order: integer(2),
                published: bool(true),
              },
            },
          },
        ]),
      ),
    );

    const photos = await fetchPublishedPhotos();

    expect(photos).toHaveLength(1);
    expect(photos[0]).toMatchObject({
      id: "photo-1",
      title: { ko: "새벽", en: "Dawn" },
      camera: "Camera",
      exif: {
        aperture: "f/2.8",
        iso: "400",
        shutter: "",
        focalLength: "",
      },
      dimensions: { w: 2048, h: 1365 },
      coords: { lat: 37.5, lng: 127 },
      tags: ["night", "city"],
      order: 2,
      published: true,
    });
    expect(photos[0].shotAt.toISOString()).toBe("2026-07-01T01:02:03.000Z");
  });

  it("문서가 없는 runQuery 행은 빈 목록으로 처리한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([{ readTime: "now" }])));

    await expect(fetchPublishedPhotos()).resolves.toEqual([]);
  });

  it("site 설정의 배열과 중첩 map을 디코딩한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          name: "projects/demo/databases/(default)/documents/site/config",
          fields: {
            name: map({ ko: string("이성준"), en: string("Sungjoon Lee") }),
            tagline: map({ ko: string("포트폴리오"), en: string("Portfolio") }),
            links: array([
              map({ label: string("GitHub"), href: string("https://github.com/example") }),
            ]),
            tags: array([
              map({
                id: string("street"),
                ko: string("거리"),
                en: string("Street"),
              }),
            ]),
          },
        }),
      ),
    );

    await expect(fetchSiteConfig()).resolves.toMatchObject({
      name: { ko: "이성준", en: "Sungjoon Lee" },
      links: [{ label: "GitHub", href: "https://github.com/example" }],
      tags: [{ id: "street", ko: "거리", en: "Street" }],
    });
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toMatchObject({
      next: {
        revalidate: 3_600,
        tags: ["firestore:site:config"],
      },
    });
  });

  it("404 설정 문서는 null, 다른 HTTP 오류는 throw한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "missing" }, 404))
      .mockResolvedValueOnce(jsonResponse({ error: "quota" }, 429));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchSiteConfig()).resolves.toBeNull();
    await expect(fetchSiteConfig()).rejects.toThrow("Firestore site 읽기 실패 (429)");
  });

  it("runQuery HTTP 오류를 빈 콘텐츠로 삼키지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "unavailable" }, 503)));

    await expect(fetchPublishedPhotos()).rejects.toThrow("Firestore runQuery 실패 (503)");
  });
});
