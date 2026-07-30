"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Icon } from "@/components/Icon";
import { PhotoGrid } from "@/components/PhotoGrid";
import { ViewToggle } from "@/components/ViewToggle";
import { FilterBar } from "@/features/gallery/_components/FilterBar";
import { useInfiniteScroll } from "@/features/gallery/_hooks/use-infinite-scroll";
import { usePhotoFilter } from "@/features/gallery/_hooks/use-photo-filter";
import { useLang } from "@/features/lang/_hooks/use-lang";
import {
  OnDemandPhotoModal,
  preloadPhotoModal,
} from "@/features/photo-detail/_components/OnDemandPhotoModal";
import type { GalleryPhoto } from "@/types/gallery-photo";
import type { Tag } from "@/types/tag";

import styles from "./GalleryView.module.css";

type Props = {
  photos: GalleryPhoto[];
  tags: Tag[];
};

/** 작업(Work) 뷰 — 툴바(제목·카운트·뷰토글) + 필터 + 그리드 + 상세 모달. 검색어는 헤더 ?q를 시드. */
const GalleryView = ({ photos, tags }: Props) => {
  const { dict, lang } = useLang();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [square, setSquare] = useState(false);
  const filter = usePhotoFilter(photos, initialQuery);
  // 필터된 목록을 화면엔 점진 렌더(무한스크롤) — 필터/검색이 바뀌면 자동으로 처음부터.
  const { visible: windowed, hasMore, attachSentinel } = useInfiniteScroll(filter.visible);
  const cameras = useMemo(() => [...new Set(photos.map((photo) => photo.camera))], [photos]);
  const photoIds = useMemo(() => photos.map((photo) => photo.id), [photos]);

  return (
    <>
      <main className={styles.main}>
        <div className={styles.toolbar}>
          <h1 className={styles.title}>{dict.workNav}</h1>
          <div className={styles.tools}>
            <span className={styles.count}>{filter.visible.length} photos</span>
            <ViewToggle
              square={square}
              onChange={setSquare}
              masonryLabel={dict.viewMasonry}
              squareLabel={dict.viewSquare}
            />
          </div>
        </div>

        {/* 모바일 인갤러리 검색 (데스크톱은 헤더 검색 사용) */}
        <label className={styles.mSearch}>
          <Icon name="search" size={15} />
          <input
            type="text"
            value={filter.query}
            onChange={(event) => filter.setQuery(event.target.value)}
            placeholder={dict.searchPlaceholder}
            aria-label={dict.searchPlaceholder}
          />
        </label>

        <FilterBar
          tags={tags}
          cameras={cameras}
          tag={filter.tag}
          onTag={filter.setTag}
          camera={filter.camera}
          onCamera={filter.setCamera}
          focalMin={filter.focalMin}
          focalMax={filter.focalMax}
          onFocal={filter.setFocal}
          onReset={filter.resetFilters}
          filtersActive={filter.filtersActive}
        />

        <PhotoGrid
          photos={windowed}
          lang={lang}
          square={square}
          emptyLabel={dict.emptyResults}
          onTilePreload={preloadPhotoModal}
        />

        {/* 무한스크롤 트리거 — 남은 사진이 있을 때만. 보이면 다음 페이지 렌더. */}
        {hasMore ? (
          <div ref={attachSentinel} className={styles.sentinel} aria-hidden="true" />
        ) : null}
      </main>

      {/* 상세 모달은 필터와 무관한 전체 ID 순서를 유지하고 현재·양옆 상세만 가져온다. */}
      <OnDemandPhotoModal photoIds={photoIds} endpoint="/api/photos" initialTags={tags} />
    </>
  );
};

export { GalleryView };
