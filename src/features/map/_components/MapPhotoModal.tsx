"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MapPhotoPayload } from "@/features/map/_lib/map-photo-payload";
import { revivePhoto } from "@/features/map/_lib/map-photo-payload";
import { replaceCurrentUrl } from "@/lib/navigation/replace-current-url";
import type { Photo } from "@/types/photo";
import type { Tag } from "@/types/tag";

import styles from "./MapPhotoModal.module.css";

const loadPhotoModal = () => import("@/features/photo-detail/_components/PhotoModal");
const PhotoModal = dynamic(() => loadPhotoModal().then((module) => module.PhotoModal), {
  ssr: false,
});

type Props = {
  photoIds: string[];
};

const MapPhotoModal = ({ photoIds }: Props) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("photo");
  const [photosById, setPhotosById] = useState<Record<string, Photo>>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const wasOpen = useRef(activeId != null);
  const openedHere = useRef(false);

  useEffect(() => {
    const open = activeId != null;
    if (!wasOpen.current && open) openedHere.current = true;
    if (!open) openedHere.current = false;
    wasOpen.current = open;
  }, [activeId]);

  const close = useCallback(() => {
    if (openedHere.current) {
      openedHere.current = false;
      router.back();
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("photo");
    const query = params.toString();
    replaceCurrentUrl(query ? `${window.location.pathname}?${query}` : window.location.pathname);
  }, [router, searchParams]);

  useEffect(() => {
    if (!activeId || !photoIds.includes(activeId)) return;

    void loadPhotoModal();
    const index = photoIds.indexOf(activeId);
    const neededIds = [
      photoIds[(index - 1 + photoIds.length) % photoIds.length],
      activeId,
      photoIds[(index + 1) % photoIds.length],
    ].filter((id): id is string => id != null);
    if (tags.length > 0 && neededIds.every((id) => photosById[id])) return;

    const controller = new AbortController();

    fetch(`/api/photo-map/${encodeURIComponent(activeId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Photo map request failed: ${response.status}`);
        return (await response.json()) as MapPhotoPayload;
      })
      .then((payload) => {
        const revived = payload.photos.map(revivePhoto);
        setPhotosById((current) => {
          const next = { ...current };
          for (const photo of revived) next[photo.id] = photo;
          return next;
        });
        setTags(payload.tags);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setFailedId(activeId);
      });

    return () => controller.abort();
  }, [activeId, photoIds, photosById, retry, tags.length]);

  const photos = useMemo(
    () => photoIds.flatMap((id) => (photosById[id] ? [photosById[id]] : [])),
    [photoIds, photosById],
  );
  const activePhoto = activeId ? photosById[activeId] : undefined;
  const knownActiveId = activeId ? photoIds.includes(activeId) : false;

  if (!activeId) return null;

  if (!activePhoto) {
    return (
      <div className={styles.pending} role="dialog" aria-modal="true" aria-label="사진 불러오는 중">
        <button type="button" className={styles.scrim} aria-label="닫기" onClick={close} />
        <div className={styles.card}>
          {failedId === activeId || !knownActiveId ? (
            <>
              <p>사진을 불러오지 못했습니다.</p>
              {knownActiveId ? (
                <button
                  type="button"
                  className={styles.retry}
                  onClick={() => {
                    setFailedId(null);
                    setRetry((value) => value + 1);
                  }}
                >
                  다시 시도
                </button>
              ) : null}
            </>
          ) : (
            <span className={styles.spinner} aria-label="사진 불러오는 중" />
          )}
        </div>
      </div>
    );
  }

  return <PhotoModal photos={photos} tags={tags} photoIds={photoIds} onClose={close} />;
};

export { MapPhotoModal };
