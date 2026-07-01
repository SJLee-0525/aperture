"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Icon } from "@/components/Icon";
import { PhotoGrid } from "@/components/PhotoGrid";
import { ViewToggle } from "@/components/ViewToggle";
import { FilterBar } from "@/features/gallery/FilterBar";
import { usePhotoFilter } from "@/features/gallery/use-photo-filter";
import { useLang } from "@/features/lang/use-lang";
import type { Photo } from "@/types/photo";
import type { Tag } from "@/types/tag";

import styles from "./GalleryView.module.css";

type Props = {
  photos: Photo[];
  tags: Tag[];
};

/** 작업(Work) 뷰 — 툴바(제목·카운트·뷰토글) + 필터 + 그리드. 검색어는 헤더가 넘긴 ?q를 시드. */
const GalleryView = ({ photos, tags }: Props) => {
  const { dict, lang } = useLang();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [square, setSquare] = useState(false);
  const filter = usePhotoFilter(photos, initialQuery);
  const cameras = useMemo(() => [...new Set(photos.map((photo) => photo.camera))], [photos]);

  return (
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
        photos={filter.visible}
        lang={lang}
        square={square}
        emptyLabel={dict.emptyResults}
      />
    </main>
  );
};

export { GalleryView };
