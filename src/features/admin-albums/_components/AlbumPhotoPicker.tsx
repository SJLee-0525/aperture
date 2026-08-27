"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import Image from "next/image";
import { useMemo, useState } from "react";

import { AdminButton } from "@/components/AdminButton";
import { AdminInput } from "@/components/AdminInput";
import { Icon } from "@/components/Icon";

import { imageThumbnailUrl } from "@/types/image";

import type { AdminPhotoListItem } from "@/types/admin";

import styles from "./AlbumPhotoPicker.module.css";
import { SelectedPhotoChip } from "./SelectedPhotoChip";

type Props = {
  photos: AdminPhotoListItem[];
  status: "loading" | "ready" | "error";
  error: string | null;
  photoIds: string[];
  coverPhotoId: string;
  onToggle: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onSetCover: (id: string) => void;
};

const PAGE_SIZE = 60;

/**
 * 앨범 사진 선택·순서·커버 UI.
 * - 하단 그리드: 전체 사진 → 클릭으로 포함/제외 토글(선택 시 photoIds 끝에 추가).
 * - 상단 스트립: 선택된 사진 → dnd-kit 으로 순서 변경, 커버 지정.
 * 제외 시 커버였다면 남은 첫 사진으로 커버 이전(없으면 빈 값).
 *
 * @param {Props} props
 * @param {AdminPhotoListItem[]} props.photos
 * @param {'loading' | 'ready' | 'error'} props.status
 * @param {string | null} props.error
 * @param {string[]} props.photoIds
 * @param {string} props.coverPhotoId
 * @param {(id: string) => void} props.onToggle
 * @param {(activeId: string, overId: string) => void} props.onReorder
 * @param {(id: string) => void} props.onSetCover
 * @returns {JSX.Element}
 */
const AlbumPhotoPicker = ({
  photos,
  status,
  error,
  photoIds,
  coverPhotoId,
  onToggle,
  onReorder,
  onSetCover,
}: Props) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const photoById = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const selectedSet = useMemo(() => new Set(photoIds), [photoIds]);

  /** 순서 유지한 채 실제 존재하는 사진만 매핑(삭제된 참조는 걸러짐). */
  const selectedPhotos = useMemo(
    () =>
      photoIds.flatMap((id) => {
        const photo = photoById.get(id);
        return photo ? [photo] : [];
      }),
    [photoIds, photoById],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredPhotos = useMemo(
    () =>
      normalizedQuery
        ? photos.filter((photo) =>
            [photo.title.ko, photo.title.en, photo.id].some((value) =>
              value.toLocaleLowerCase().includes(normalizedQuery),
            ),
          )
        : photos,
    [normalizedQuery, photos],
  );
  const visiblePhotos = filteredPhotos.slice(0, visibleCount);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  if (status === "loading") return <p className={styles.state}>사진을 불러오는 중…</p>;
  if (status === "error")
    return (
      <p className={styles.stateError} role="alert">
        {error ?? "사진을 불러오지 못했습니다."}
      </p>
    );

  return (
    <div className={styles.picker}>
      <div className={styles.block}>
        <p className={styles.blockLabel}>
          선택된 사진 ({selectedPhotos.length}장) — 드래그로 순서, “커버로”로 대표 지정
        </p>
        {selectedPhotos.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={selectedPhotos.map((p) => p.id)}
              strategy={horizontalListSortingStrategy}
            >
              <ul className={styles.strip}>
                {selectedPhotos.map((photo) => (
                  <SelectedPhotoChip
                    key={photo.id}
                    photo={photo}
                    isCover={photo.id === coverPhotoId}
                    onSetCover={onSetCover}
                    onRemove={onToggle}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        ) : (
          <p className={styles.emptySel}>아래에서 사진을 눌러 앨범에 추가하세요.</p>
        )}
      </div>

      <div className={styles.block}>
        <div className={styles.photoToolbar}>
          <p className={styles.blockLabel}>전체 사진 — 눌러서 추가/제외</p>
          <AdminInput
            type="search"
            size="sm"
            className={styles.search}
            aria-label="사진 검색"
            value={query}
            placeholder="제목 또는 ID"
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
          />
        </div>
        {photos.length > 0 ? (
          <>
            <ul className={styles.grid}>
              {visiblePhotos.map((photo) => {
                const on = selectedSet.has(photo.id);
                const previewUrl = imageThumbnailUrl(photo.image);
                return (
                  <li key={photo.id} className={styles.gridItem}>
                    <button
                      type="button"
                      className={`${styles.tile} ${on ? styles.tileOn : ""}`}
                      onClick={() => onToggle(photo.id)}
                      aria-pressed={on}
                      title={photo.title.ko || "사진"}
                    >
                      {previewUrl ? (
                        <Image
                          src={previewUrl}
                          alt={photo.title.ko || "사진"}
                          fill
                          sizes="96px"
                          className={styles.tileImg}
                        />
                      ) : null}
                      {on ? (
                        <span className={styles.check}>
                          <Icon name="check" size={14} />
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            {visibleCount < filteredPhotos.length ? (
              <AdminButton
                variant="secondary"
                size="sm"
                className={styles.more}
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                더 보기 ({visibleCount}/{filteredPhotos.length})
              </AdminButton>
            ) : null}
            {filteredPhotos.length === 0 ? (
              <p className={styles.emptySel}>검색 결과가 없습니다.</p>
            ) : null}
          </>
        ) : (
          <p className={styles.emptySel}>등록된 사진이 없습니다. 먼저 사진을 추가하세요.</p>
        )}
      </div>
    </div>
  );
};

export { AlbumPhotoPicker };
