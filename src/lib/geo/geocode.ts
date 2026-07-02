/**
 * 장소 지오코딩 — OpenStreetMap Nominatim (무료·키/카드 불필요, CORS 허용).
 * 지도(CARTO)와 동일하게 결제 표면을 늘리지 않는다(아키텍처 $0 원칙). Google Places는 카드 필요 → 미사용.
 * ⚠️ Nominatim 사용 정책: 자동완성(키 입력마다 호출) 금지 → "검색" 실행 시에만 호출한다.
 *    결과 표시 시 OpenStreetMap 저작자 표기(attribution)를 함께 노출한다.
 */
const ENDPOINT = "https://nominatim.openstreetmap.org";

/** osm_type → lookup 접두사. */
const PREFIX: Record<string, string> = { relation: "R", way: "W", node: "N" };

type GeoResult = {
  key: string;
  osmType: string;
  osmId: number;
  nameKo: string; // display_name (accept-language=ko)
  lat: number;
  lng: number;
};

type NominatimSearch = {
  osm_type: string;
  osm_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

/** 장소 검색(한국어 표기 기준). 좌표·osm 식별자 포함. */
const searchPlaces = async (query: string): Promise<GeoResult[]> => {
  const q = query.trim();
  if (!q) return [];
  const url = `${ENDPOINT}/search?q=${encodeURIComponent(q)}&format=jsonv2&accept-language=ko&limit=10`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new Error("장소 검색 요청에 실패했습니다. 네트워크를 확인하세요.");
  }
  if (!res.ok) throw new Error("장소 검색에 실패했습니다.");
  const data = (await res.json()) as NominatimSearch[];
  return data
    .filter((r) => PREFIX[r.osm_type])
    .map((r) => ({
      key: `${r.osm_type}-${r.osm_id}`,
      osmType: r.osm_type,
      osmId: r.osm_id,
      nameKo: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
    }));
};

/** 선택한 장소의 영어 표기 — 실패하면 빈 문자열(호출부가 ko 로 폴백). */
const fetchPlaceEnglish = async (osmType: string, osmId: number): Promise<string> => {
  const prefix = PREFIX[osmType];
  if (!prefix) return "";
  try {
    const url = `${ENDPOINT}/lookup?osm_ids=${prefix}${osmId}&format=jsonv2&accept-language=en`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return "";
    const data = (await res.json()) as { display_name?: string }[];
    return data[0]?.display_name ?? "";
  } catch {
    return "";
  }
};

export { fetchPlaceEnglish, searchPlaces };
export type { GeoResult };
