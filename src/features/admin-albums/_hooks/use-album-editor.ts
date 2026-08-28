"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { useEditorSession } from "@/features/admin-shell/_hooks/use-editor-session";

import {
  albumToInput,
  emptyAlbumInput,
  prepareAlbumInput,
} from "@/features/admin-albums/_lib/album-form-data";
import { validateAlbumInput } from "@/features/admin-albums/_lib/validate-album-input";

import { ROUTES } from "@/constants/routes";
import { getAlbumRepository } from "@/lib/admin/album-repository";
import { focusFirstIssue } from "@/lib/admin/field-issue";
import { getPhotoRepository } from "@/lib/admin/photo-repository";

import type { FieldIssue } from "@/lib/admin/field-issue";
import type { AlbumInput } from "@/lib/supabase/albums";
import type { AdminPhotoListItem } from "@/types/admin";
import type { Album } from "@/types/album";

type PhotoStatus = "loading" | "ready" | "error";

const useAlbumEditor = (albumId: string, initial?: Album) => {
  const router = useRouter();
  const isEdit = initial != null;
  const [form, setForm] = useState<AlbumInput>(() =>
    initial ? albumToInput(initial) : emptyAlbumInput(),
  );
  const [photos, setPhotos] = useState<AdminPhotoListItem[]>([]);
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>("loading");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const { dirty, confirmLeave, markSaved, recovery, clearRecovery } = useEditorSession(
    "albums",
    albumId,
    form,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getPhotoRepository()
      .list()
      .then((loaded) => {
        if (!active) return;
        setPhotos(loaded);
        setPhotoStatus("ready");
      })
      .catch((caught: Error) => {
        if (!active) return;
        setPhotoError(caught.message);
        setPhotoStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const applyForm = (next: typeof form) => setForm(next);

  const patch = useCallback(
    (next: Partial<AlbumInput>) => setForm((current) => ({ ...current, ...next })),
    [],
  );

  const togglePhoto = useCallback((id: string) => {
    setForm((current) => {
      const removing = current.photoIds.includes(id);
      const photoIds = removing
        ? current.photoIds.filter((photoId) => photoId !== id)
        : [...current.photoIds, id];
      const coverPhotoId =
        current.coverPhotoId === id
          ? (photoIds[0] ?? "")
          : current.coverPhotoId || (removing ? "" : id);
      return { ...current, photoIds, coverPhotoId };
    });
  }, []);

  const reorderPhotos = useCallback((activeId: string, overId: string) => {
    setForm((current) => {
      const from = current.photoIds.indexOf(activeId);
      const to = current.photoIds.indexOf(overId);
      if (from < 0 || to < 0 || from === to) return current;
      return { ...current, photoIds: arrayMove(current.photoIds, from, to) };
    });
  }, []);

  const setCover = useCallback((coverPhotoId: string) => {
    setForm((current) =>
      current.photoIds.includes(coverPhotoId) ? { ...current, coverPhotoId } : current,
    );
  }, []);

  const availableIds = useMemo(() => new Set(photos.map((photo) => photo.id)), [photos]);
  const selectedPhotoIds = useMemo(
    () =>
      photoStatus === "ready" ? form.photoIds.filter((id) => availableIds.has(id)) : form.photoIds,
    [availableIds, form.photoIds, photoStatus],
  );

  const cancel = useCallback(() => {
    if (!confirmLeave()) return;
    clearRecovery();
    router.replace(ROUTES.ADMIN_ALBUMS);
  }, [confirmLeave, router, clearRecovery]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    // 형제 다섯은 폼 값을 그대로 검증하는데 앨범만 정규화 뒤를 본다. 검증 대상인
    // photoIds 가 폼이 아니라 선택 상태에서 오고, coverPhotoId 보정도 그 뒤에 확정된다.
    const normalized = prepareAlbumInput({ ...form, photoIds: selectedPhotoIds });
    const input = {
      ...normalized,
      cover: photos.find((photo) => photo.id === normalized.coverPhotoId)?.image ?? null,
    };
    const nextIssues = validateAlbumInput(input);
    setIssues(nextIssues);
    if (nextIssues.length > 0) {
      focusFirstIssue(formRef.current, nextIssues);
      return;
    }

    setSaving(true);
    try {
      const albumRepository = getAlbumRepository();
      await (isEdit
        ? albumRepository.update(albumId, input)
        : albumRepository.create(albumId, input));
      markSaved(form);
      clearRecovery();
      router.replace(ROUTES.ADMIN_ALBUMS);
    } catch (caught) {
      setError((caught as Error).message);
      setSaving(false);
    }
  };

  return {
    recovery,
    applyForm,
    dirty,
    formRef,
    issues,
    cancel,
    error,
    form,
    isEdit,
    patch,
    photoError,
    photos,
    photoStatus,
    reorderPhotos,
    saving,
    selectedPhotoIds,
    setCover,
    submit,
    togglePhoto,
  };
};

export { useAlbumEditor };
