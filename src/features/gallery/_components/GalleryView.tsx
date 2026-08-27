"use client";

import { useSearchParams } from "next/navigation";
import { memo, useMemo, useState } from "react";

import { PageToolbar } from "@/components/PageToolbar";
import { PhotoGrid } from "@/components/PhotoGrid";
import { ViewToggle } from "@/components/ViewToggle";
import { FilterBar } from "@/features/gallery/_components/FilterBar";
import {
  OnDemandPhotoModal,
  preloadPhotoModal,
} from "@/features/photo-detail/_components/OnDemandPhotoModal";

import { useGalleryTools } from "@/features/gallery/_hooks/use-gallery-tools";
import { useInfiniteScroll } from "@/features/gallery/_hooks/use-infinite-scroll";
import { usePhotoFilter } from "@/features/gallery/_hooks/use-photo-filter";
import { useLang } from "@/features/lang/_hooks/use-lang";

import { countLabel } from "@/lib/format/count-label";
import { parsePhotoFilterQuery } from "@/lib/photo/filter-query";

import type { GalleryPhoto } from "@/types/gallery-photo";
import type { Tag } from "@/types/tag";

import styles from "./GalleryView.module.css";

type Props = {
  photos: GalleryPhoto[];
  tags: Tag[];
};

type GalleryContentProps = Props & {
  cameras: string[];
  initialQuery: string;
  // primitive 필터 props는 ?photo=만 바뀔 때 memo된 그리드의 재렌더를 막는다.
  tag: string;
  camera: string;
  focalMin: number;
  focalMax: number;
};

/** photo 쿼리만 바뀔 때 정적인 배경 갤러리가 다시 렌더되지 않도록 모달 구독과 분리한다. */
const GalleryContent = memo(function GalleryContent({
  photos,
  tags,
  cameras,
  initialQuery,
  tag,
  camera,
  focalMin,
  focalMax,
}: GalleryContentProps) {
  const { dict, lang } = useLang();
  const [square, setSquare] = useState(false);
  const vocabulary = useMemo(() => ({ tags, cameras }), [tags, cameras]);
  const urlFilters = useMemo(
    () => ({ tag, camera, focalMin, focalMax }),
    [tag, camera, focalMin, focalMax],
  );
  const filter = usePhotoFilter(photos, initialQuery, urlFilters, vocabulary);
  // WebMCP 도구는 필터 상태와 같은 컴포넌트에서 등록한다.
  useGalleryTools(photos, tags, filter, cameras);
  // 필터된 목록은 무한스크롤로 나눠 렌더한다.
  const { visible: windowed, hasMore, attachSentinel } = useInfiniteScroll(filter.visible);

  return (
    <main className={styles.main}>
      <PageToolbar title={dict.workNav} count={countLabel(filter.visible.length, "photo")} countLive>
        <ViewToggle
          options={[
            { id: "mason", label: dict.viewMasonry, icon: "mason" },
            { id: "square", label: dict.viewSquare, icon: "square" },
          ]}
          value={square ? "square" : "mason"}
          onChange={(id) => setSquare(id === "square")}
        />
      </PageToolbar>

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
        onFocalCommit={filter.commitFocal}
        onFocalCancel={filter.cancelFocal}
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

      {/* 남은 사진이 있을 때만 무한스크롤 sentinel을 렌더한다. */}
      {hasMore ? <div ref={attachSentinel} className={styles.sentinel} aria-hidden="true" /> : null}
    </main>
  );
});

/**
 * 작업(Work) 뷰는 URL의 검색, 필터, 상세 모달 상태를 구독한다. 배경 갤러리는
 * 파싱된 primitive props의 memo 경계로 격리한다.
 *
 * @param {Props} props
 * @param {GalleryPhoto[]} props.photos
 * @param {Tag[]} props.tags
 * @returns {JSX.Element}
 */
const GalleryView = ({ photos, tags }: Props) => {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const photoIds = useMemo(() => photos.map((photo) => photo.id), [photos]);
  const cameras = useMemo(
    () => [...new Set(photos.map((photo) => photo.camera).filter((camera) => camera.trim()))],
    [photos],
  );
  const parsed = useMemo(
    () => parsePhotoFilterQuery(searchParams, { tags, cameras }),
    [searchParams, tags, cameras],
  );

  return (
    <>
      <GalleryContent
        photos={photos}
        tags={tags}
        cameras={cameras}
        initialQuery={initialQuery}
        tag={parsed.tag}
        camera={parsed.camera}
        focalMin={parsed.focalMin}
        focalMax={parsed.focalMax}
      />
      {/* 상세 모달은 필터와 무관한 전체 ID 순서를 유지하고 현재·양옆 상세만 가져온다. */}
      <OnDemandPhotoModal
        photoIds={photoIds}
        endpoint="/api/photos"
        initialTags={tags}
        chatTarget
      />
    </>
  );
};

export { GalleryView };
