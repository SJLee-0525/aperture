"use client";

import { useState, type KeyboardEvent } from "react";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";

import { fetchPlaceEnglish, searchPlaces, type GeoResult } from "@/lib/geo/geocode";

import type { LocalizedText } from "@/types/localized";

import styles from "./PlaceField.module.css";

type Props = {
  place: LocalizedText;
  latStr: string;
  lngStr: string;
  /** 방금 올린 파일의 EXIF 에서 좌표가 채워졌는지. */
  fromExif: boolean;
  onPlaceChange: (place: LocalizedText) => void;
  onLatChange: (value: string) => void;
  onLngChange: (value: string) => void;
  onClearCoords: () => void;
  /** 검색 결과 선택 → 장소명(ko/en) + 좌표를 한 번에 채운다. */
  onPickResult: (place: LocalizedText, lat: number, lng: number) => void;
};

type Mode = "search" | "manual";

/**
 * 장소 지정 — 검색(Nominatim, 좌표 자동) / 직접 입력(이름·좌표 수동) 두 방식.
 * 상태(place·lat·lng)는 부모(PhotoForm)가 소유하고, 이 컴포넌트는 표현만 담당한다.
 *
 * @param {Props} props
 * @param {LocalizedText} props.place
 * @param {string} props.latStr
 * @param {string} props.lngStr
 * @param {(place: LocalizedText) => void} props.onPlaceChange
 * @param {(value: string) => void} props.onLatChange
 * @param {(value: string) => void} props.onLngChange
 * @param {() => void} props.onClearCoords
 * @param {(place: LocalizedText, lat: number, lng: number) => void} props.onPickResult - 검색 결과 선택 → 장소명(ko/en) + 좌표를 한 번에 채운다.
 * @returns {JSX.Element}
 */
const PlaceField = ({
  place,
  latStr,
  lngStr,
  fromExif,
  onPlaceChange,
  onLatChange,
  onLngChange,
  onClearCoords,
  onPickResult,
}: Props) => {
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    setError(null);
    setResults([]);
    try {
      const found = await searchPlaces(query);
      setResults(found);
      if (found.length === 0) setError("검색 결과가 없습니다. 다른 표현으로 시도하세요.");
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch();
    }
  };

  const pick = async (result: GeoResult) => {
    if (picking) return;
    setPicking(true);
    try {
      const en = await fetchPlaceEnglish(result.osmType, result.osmId);
      onPickResult({ ko: result.nameKo, en: en || result.nameKo }, result.lat, result.lng);
      setResults([]);
      setQuery("");
    } finally {
      setPicking(false);
    }
  };

  const hasCoords = latStr.trim() !== "" && lngStr.trim() !== "";

  return (
    <div className={styles.wrap}>
      {/* role="tab" 이 아니라 aria-pressed 를 쓴다. tablist 규약은 방향키 이동과
          tabpanel 연결까지 요구하는데, 이 둘은 화면을 바꾸는 토글 버튼이다.
          같은 형태가 블로그 목록의 상태 필터에 이미 있다. */}
      <div className={styles.tabs} role="group" aria-label="위치 입력 방식">
        <button
          type="button"
          className={mode === "search" ? styles.tabActive : styles.tab}
          aria-pressed={mode === "search"}
          onClick={() => setMode("search")}
        >
          검색
        </button>
        <button
          type="button"
          className={mode === "manual" ? styles.tabActive : styles.tab}
          aria-pressed={mode === "manual"}
          onClick={() => setMode("manual")}
        >
          직접 입력
        </button>
      </div>

      {mode === "search" ? (
        <div className={styles.panel}>
          <div className={styles.searchRow}>
            <AdminInput
              size="sm"
              className={styles.searchInput}
              value={query}
              aria-label="장소 검색"
              placeholder="도쿄 미나토구, Jeju"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onSearchKeyDown}
            />
            <AdminButton
              variant="primary"
              size="sm"
              className={styles.searchBtn}
              onClick={runSearch}
              disabled={searching || !query.trim()}
            >
              {searching ? "검색 중…" : "검색"}
            </AdminButton>
          </div>
          {error ? <p className={styles.hint}>{error}</p> : null}
          {results.length > 0 ? (
            <ul className={styles.results}>
              {results.map((result) => (
                <li key={result.key}>
                  <button
                    type="button"
                    className={styles.result}
                    onClick={() => pick(result)}
                    disabled={picking}
                  >
                    <span className={styles.resultName}>{result.nameKo}</span>
                    <span className={styles.resultCoord}>
                      {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className={styles.attribution}>검색: © OpenStreetMap contributors</p>
        </div>
      ) : (
        <div className={styles.panel}>
          <div className={styles.grid2}>
            <AdminField label="장소 (한국어)">
              <AdminInput
                size="sm"
                value={place.ko}
                onChange={(event) => onPlaceChange({ ...place, ko: event.target.value })}
              />
            </AdminField>
            <AdminField label="장소 (English)">
              <AdminInput
                size="sm"
                value={place.en}
                onChange={(event) => onPlaceChange({ ...place, en: event.target.value })}
              />
            </AdminField>
            <AdminField label="위도 (lat)">
              <AdminInput
                size="sm"
                type="number"
                step="any"
                value={latStr}
                onChange={(event) => onLatChange(event.target.value)}
              />
            </AdminField>
            <AdminField label="경도 (lng)">
              <AdminInput
                size="sm"
                type="number"
                step="any"
                value={lngStr}
                onChange={(event) => onLngChange(event.target.value)}
              />
            </AdminField>
          </div>
          <p className={styles.hint}>좌표를 비우면 지도에 핀이 표시되지 않습니다.</p>
        </div>
      )}

      <div className={styles.current}>
        <span className={styles.currentLabel}>선택됨</span>
        <span className={styles.currentValue}>
          {place.ko || place.en || "장소 없음"}
          {hasCoords ? ` · ${latStr}, ${lngStr}` : " · 좌표 없음"}
        </span>
        {fromExif ? <span className={styles.exifBadge}>EXIF 자동 입력</span> : null}
        {hasCoords ? (
          <AdminButton
            variant="secondary"
            size="sm"
            className={styles.clearCoords}
            onClick={onClearCoords}
          >
            좌표 지우기
          </AdminButton>
        ) : null}
      </div>
    </div>
  );
};

export { PlaceField };
