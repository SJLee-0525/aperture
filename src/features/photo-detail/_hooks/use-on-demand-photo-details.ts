"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { mergePhotoCache } from "@/features/photo-detail/_lib/photo-cache";
import { revivePhoto } from "@/features/photo-detail/_lib/photo-detail-payload";

import type { PhotoDetailPayload } from "@/features/photo-detail/_lib/photo-detail-payload";
import type { Photo } from "@/types/photo";
import type { Tag } from "@/types/tag";

const useOnDemandPhotoDetails = (
  activeId: string | null,
  photoIds: string[],
  endpoint: string,
  initialTags: Tag[],
) => {
  const [photosById, setPhotosById] = useState<Map<string, Photo>>(() => new Map());
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const cacheRef = useRef(photosById);
  const tagsLoadedRef = useRef(initialTags.length > 0);

  useEffect(() => {
    cacheRef.current = photosById;
  }, [photosById]);

  useEffect(() => {
    if (!activeId || !photoIds.includes(activeId)) return;

    const index = photoIds.indexOf(activeId);
    const neededIds = [
      photoIds[(index - 1 + photoIds.length) % photoIds.length],
      activeId,
      photoIds[(index + 1) % photoIds.length],
    ].filter((id): id is string => id != null);
    if (tagsLoadedRef.current && neededIds.every((id) => cacheRef.current.has(id))) return;

    const controller = new AbortController();
    fetch(`${endpoint}/${encodeURIComponent(activeId)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Photo detail request failed: ${response.status}`);
        return (await response.json()) as PhotoDetailPayload;
      })
      .then((payload) => {
        setPhotosById((current) => mergePhotoCache(current, payload.photos.map(revivePhoto)));
        setTags(payload.tags);
        tagsLoadedRef.current = true;
        // 실패 기록을 남겨 두면 나중에 이 사진이 정상 로드돼도 오류 화면이 다시 뜬다.
        setFailedId(null);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setFailedId(activeId);
      });

    return () => controller.abort();
  }, [activeId, endpoint, photoIds, retryVersion]);

  const photos = useMemo(
    () => photoIds.flatMap((id) => (photosById.has(id) ? [photosById.get(id)!] : [])),
    [photoIds, photosById],
  );
  const activePhoto = activeId ? photosById.get(activeId) : undefined;
  const retry = useCallback(() => {
    setFailedId(null);
    setRetryVersion((version) => version + 1);
  }, []);

  return { activePhoto, failed: failedId === activeId, photos, retry, tags };
};

export { useOnDemandPhotoDetails };
