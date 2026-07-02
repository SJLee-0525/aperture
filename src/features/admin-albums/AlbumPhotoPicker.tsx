"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { listPhotosAdmin } from "@/lib/firebase/firestore";
import type { Photo } from "@/types/photo";

import styles from "./AlbumPhotoPicker.module.css";
import { SelectedPhotoChip } from "./SelectedPhotoChip";

type Status = "loading" | "ready" | "error";

type Props = {
  /** 앨범에 포함된 사진 id (순서 = 표시 순서). */
  photoIds: string[];
  /** 커버로 지정된 사진 id. */
  coverPhotoId: string;
  onChangePhotoIds: (photoIds: string[]) => void;
  onChangeCover: (coverPhotoId: string) => void;
};

/**
 * 앨범 사진 선택·순서·커버 UI.
 * - 하단 그리드: 전체 사진 → 클릭으로 포함/제외 토글(선택 시 photoIds 끝에 추가).
 * - 상단 스트립: 선택된 사진 → dnd-kit 으로 순서 변경, 커버 지정.
 * 제외 시 커버였다면 남은 첫 사진으로 커버 이전(없으면 빈 값).
 */
const AlbumPhotoPicker = ({ photoIds, coverPhotoId, onChangePhotoIds, onChangeCover }: Props) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    let alive = true;
    listPhotosAdmin()
      .then((loaded) => {
        if (!alive) return;
        setPhotos(loaded);
        setStatus("ready");
      })
      .catch((caught: Error) => {
        if (!alive) return;
        setError(caught.message);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const photoById = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const selectedSet = useMemo(() => new Set(photoIds), [photoIds]);

  /** 순서 유지한 채 실제 존재하는 사진만 매핑(삭제된 참조는 걸러짐). */
  const selectedPhotos = useMemo(
    () => photoIds.map((id) => photoById.get(id)).filter((p): p is Photo => p != null),
    [photoIds, photoById],
  );

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      const next = photoIds.filter((pid) => pid !== id);
      onChangePhotoIds(next);
      // 커버였던 사진을 제외하면 남은 첫 사진으로 커버 이전.
      if (coverPhotoId === id) onChangeCover(next[0] ?? "");
    } else {
      const next = [...photoIds, id];
      onChangePhotoIds(next);
      // 첫 사진이면 자동으로 커버 지정.
      if (!coverPhotoId) onChangeCover(id);
    }
  };

  const removeSelected = (id: string) => toggle(id);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = photoIds.indexOf(String(active.id));
    const to = photoIds.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onChangePhotoIds(arrayMove(photoIds, from, to));
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
                    onSetCover={onChangeCover}
                    onRemove={removeSelected}
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
        <p className={styles.blockLabel}>전체 사진 — 눌러서 추가/제외</p>
        {photos.length > 0 ? (
          <ul className={styles.grid}>
            {photos.map((photo) => {
              const on = selectedSet.has(photo.id);
              return (
                <li key={photo.id} className={styles.gridItem}>
                  <button
                    type="button"
                    className={`${styles.tile} ${on ? styles.tileOn : ""}`}
                    onClick={() => toggle(photo.id)}
                    aria-pressed={on}
                    title={photo.title.ko || "사진"}
                  >
                    {photo.image?.url ? (
                      <Image
                        src={photo.image.url}
                        alt={photo.title.ko || "사진"}
                        fill
                        sizes="96px"
                        className={styles.tileImg}
                      />
                    ) : null}
                    {on ? <span className={styles.check}>✓</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.emptySel}>등록된 사진이 없습니다. 먼저 사진을 추가하세요.</p>
        )}
      </div>
    </div>
  );
};

export { AlbumPhotoPicker };
