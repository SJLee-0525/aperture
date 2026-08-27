"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent } from "react";

import {
  applyUploadResult,
  createPhotoInput,
  parseCoords,
  preparePhotoInput,
} from "@/features/admin-photos/_lib/photo-form-data";
import { validatePhotoInput } from "@/features/admin-photos/_lib/validate-photo-input";
import { imagePaths, removeUnreferencedImages } from "@/features/image-upload/_lib/asset-lifecycle";

import { ROUTES } from "@/constants/routes";
import { getPhotoRepository } from "@/lib/admin/photo-repository";

import type { UploadResult } from "@/features/image-upload/_hooks/use-image-upload";
import type { PhotoInput } from "@/lib/supabase/photos";
import type { Photo } from "@/types/photo";

const usePhotoEditor = (photoId: string, initial?: Photo) => {
  const router = useRouter();
  const isEdit = initial != null;
  const [form, setForm] = useState<PhotoInput>(() => createPhotoInput(initial));
  const [lat, setLat] = useState(() => (initial?.coords ? String(initial.coords.lat) : ""));
  const [lng, setLng] = useState(() => (initial?.coords ? String(initial.coords.lng) : ""));
  // 방금 올린 파일의 EXIF 에서 좌표가 채워졌는지. 표시하지 않으면 관리자가 촬영 위치를
  // 공개한다는 사실을 모른 채 저장하게 된다.
  const [coordsFromExif, setCoordsFromExif] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const initialPaths = useRef(new Set(imagePaths([initial?.image])));
  const uploadedPaths = useRef(new Set<string>());

  const patch = useCallback(
    (next: Partial<PhotoInput>) => setForm((previous) => ({ ...previous, ...next })),
    [],
  );
  const patchExif = useCallback(
    (key: keyof Photo["exif"], value: string) =>
      setForm((previous) => ({ ...previous, exif: { ...previous.exif, [key]: value } })),
    [],
  );
  const onUploaded = useCallback((result: UploadResult) => {
    for (const path of imagePaths([result.image])) {
      if (!initialPaths.current.has(path)) uploadedPaths.current.add(path);
    }
    setForm((previous) => applyUploadResult(previous, result));
    if (result.exif.coords) {
      setLat(String(result.exif.coords.lat));
      setLng(String(result.exif.coords.lng));
      setCoordsFromExif(true);
    }
  }, []);

  // 관리자가 직접 고친 값은 더 이상 EXIF 자동 입력이 아니다.
  const editLat = useCallback((value: string) => {
    setCoordsFromExif(false);
    setLat(value);
  }, []);
  const editLng = useCallback((value: string) => {
    setCoordsFromExif(false);
    setLng(value);
  }, []);
  const clearCoords = useCallback(() => {
    setCoordsFromExif(false);
    setLat("");
    setLng("");
  }, []);
  const onUploadPendingChange = useCallback((pending: boolean) => setUploading(pending), []);
  const cancel = useCallback(async () => {
    await removeUnreferencedImages(uploadedPaths.current, []).catch(() => undefined);
    router.replace(ROUTES.ADMIN_PHOTOS);
  }, [router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const validationError = validatePhotoInput(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const coords = parseCoords(lat, lng);
    // 값을 적었는데 좌표로 읽히지 않으면 조용히 버리지 않는다. 저장 후에 지도에 핀이
    // 없는 이유를 관리자가 알 수 없게 된다.
    if (coords === null && (lat.trim() !== "" || lng.trim() !== "")) {
      setError("좌표는 위도 -90~90, 경도 -180~180 범위의 숫자여야 합니다.");
      return;
    }

    const input = preparePhotoInput({ ...form, coords });
    setSaving(true);
    try {
      const photoRepository = getPhotoRepository();
      await (isEdit
        ? photoRepository.update(photoId, input)
        : photoRepository.create(photoId, input));
      await removeUnreferencedImages(
        [...initialPaths.current, ...uploadedPaths.current],
        imagePaths([input.image]),
      ).catch(() => undefined);
      router.replace(ROUTES.ADMIN_PHOTOS);
    } catch (caught) {
      setError((caught as Error).message);
      setSaving(false);
    }
  };

  return {
    cancel,
    clearCoords,
    coordsFromExif,
    error,
    form,
    isEdit,
    lat,
    lng,
    onUploaded,
    onUploadPendingChange,
    patch,
    patchExif,
    saving,
    uploading,
    setLat: editLat,
    setLng: editLng,
    submit,
  };
};

export { usePhotoEditor };
