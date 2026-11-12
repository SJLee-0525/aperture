import maplibregl from "maplibre-gl";

import type { MapOptions } from "maplibre-gl";

/**
 * MapLibre 지도를 만든다. WebGL 컨텍스트를 얻지 못하면 `null` 을 돌려준다.
 *
 * `new Map()` 은 하드웨어 가속이 꺼졌거나 GPU 가 차단된 브라우저에서 동기적으로 throw 한다.
 * 이 예외가 effect 밖으로 나가면 지도와 무관한 페이지 전체가 에러 바운더리로 넘어간다.
 */
const createMapOrNull = (options: MapOptions): maplibregl.Map | null => {
  try {
    return new maplibregl.Map(options);
  } catch (error) {
    console.warn("[map] WebGL 지도를 만들지 못했습니다.", error);
    return null;
  }
};

export { createMapOrNull };
