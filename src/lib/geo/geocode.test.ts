import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPlaceEnglish, searchPlaces } from "@/lib/geo/geocode";

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);

describe("searchPlaces", () => {
  afterEach(() => {
    fetchMock.mockReset();
  });

  it("빈 검색어에서는 네트워크를 호출하지 않는다", async () => {
    await expect(searchPlaces("   ")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("검색어를 인코딩하고 지원하는 OSM 장소만 숫자 좌표로 변환한다", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            osm_type: "relation",
            osm_id: 123,
            display_name: "서울특별시, 대한민국",
            lat: "37.5665",
            lon: "126.9780",
          },
          {
            osm_type: "area",
            osm_id: 456,
            display_name: "지원하지 않는 장소",
            lat: "0",
            lon: "0",
          },
        ]),
        { status: 200 },
      ),
    );

    await expect(searchPlaces(" 서울 역 ")).resolves.toEqual([
      {
        key: "relation-123",
        osmType: "relation",
        osmId: 123,
        nameKo: "서울특별시, 대한민국",
        lat: 37.5665,
        lng: 126.978,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://nominatim.openstreetmap.org/search?q=%EC%84%9C%EC%9A%B8%20%EC%97%AD&format=jsonv2&accept-language=ko&limit=10",
      { headers: { Accept: "application/json" } },
    );
  });

  it("네트워크 실패를 사용자용 오류로 변환한다", async () => {
    fetchMock.mockRejectedValue(new TypeError("network error"));

    await expect(searchPlaces("서울")).rejects.toThrow(
      "장소 검색 요청에 실패했습니다. 네트워크를 확인하세요.",
    );
  });

  it("HTTP 실패를 장소 검색 오류로 변환한다", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 429 }));

    await expect(searchPlaces("서울")).rejects.toThrow("장소 검색에 실패했습니다.");
  });
});

describe("fetchPlaceEnglish", () => {
  afterEach(() => {
    fetchMock.mockReset();
  });

  it.each([
    ["relation", "R"],
    ["way", "W"],
    ["node", "N"],
  ])("%s 장소를 lookup id %s로 조회한다", async (osmType, prefix) => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ display_name: "Seoul, South Korea" }]), { status: 200 }),
    );

    await expect(fetchPlaceEnglish(osmType, 123)).resolves.toBe("Seoul, South Korea");
    expect(fetchMock).toHaveBeenCalledWith(
      `https://nominatim.openstreetmap.org/lookup?osm_ids=${prefix}123&format=jsonv2&accept-language=en`,
      { headers: { Accept: "application/json" } },
    );
  });

  it("지원하지 않는 OSM 타입은 네트워크 호출 없이 빈 문자열을 반환한다", async () => {
    await expect(fetchPlaceEnglish("area", 123)).resolves.toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["HTTP 실패", () => fetchMock.mockResolvedValue(new Response(null, { status: 500 }))],
    ["네트워크 실패", () => fetchMock.mockRejectedValue(new TypeError("network error"))],
    [
      "빈 응답",
      () => fetchMock.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })),
    ],
  ])("%s 시 한국어 fallback을 위해 빈 문자열을 반환한다", async (_label, arrange) => {
    arrange();

    await expect(fetchPlaceEnglish("relation", 123)).resolves.toBe("");
  });
});
