import type { Coords } from "@/types/coords";

/** {lat,lng} → "35.6586° N, 139.7454° E" */
const formatCoords = (coords: Coords): string => {
  const ns = coords.lat >= 0 ? "N" : "S";
  const ew = coords.lng >= 0 ? "E" : "W";
  return `${Math.abs(coords.lat).toFixed(4)}° ${ns}, ${Math.abs(coords.lng).toFixed(4)}° ${ew}`;
};

export { formatCoords };
