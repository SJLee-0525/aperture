"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent } from "react";

import { ROUTES } from "@/constants/routes";
import type { UploadResult } from "@/features/image-upload/_hooks/use-image-upload";
import { imagePaths, removeUnreferencedImages } from "@/features/image-upload/_lib/asset-lifecycle";
import { createPhoto, updatePhoto, type PhotoInput } from "@/lib/firebase/firestore";
import type { Photo } from "@/types/photo";

import {
  applyUploadResult,
  createPhotoInput,
  parseCoords,
  validatePhotoInput,
} from "@/features/admin-photos/_lib/photo-draft";

const usePhotoEditor = (photoId: string, initial?: Photo) => {
  const router = useRouter();
  const isEdit = initial != null;
  const [form, setForm] = useState<PhotoInput>(() => createPhotoInput(initial));
  const [lat, setLat] = useState(() => (initial?.coords ? String(initial.coords.lat) : ""));
  const [lng, setLng] = useState(() => (initial?.coords ? String(initial.coords.lng) : ""));
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
    if (result.image.path && !initialPaths.current.has(result.image.path)) {
      uploadedPaths.current.add(result.image.path);
    }
    setForm((previous) => applyUploadResult(previous, result));
    if (result.exif.coords) {
      setLat(String(result.exif.coords.lat));
      setLng(String(result.exif.coords.lng));
    }
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

    const input = { ...form, coords: parseCoords(lat, lng) };
    setSaving(true);
    try {
      await (isEdit ? updatePhoto(photoId, input) : createPhoto(photoId, input));
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
    setLat,
    setLng,
    submit,
  };
};

export { usePhotoEditor };
