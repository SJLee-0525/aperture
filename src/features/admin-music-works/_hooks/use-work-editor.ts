"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent } from "react";

import { useEditorSession } from "@/features/admin-shell/_hooks/use-editor-session";

import { validateWorkInput } from "@/features/admin-music-works/_lib/validate-work-input";
import {
  emptyWorkInput,
  prepareWorkInput,
  workToInput,
} from "@/features/admin-music-works/_lib/work-form-data";
import { imagePaths, removeUnreferencedImages } from "@/features/image-upload/_lib/asset-lifecycle";

import { ROUTES } from "@/constants/routes";
import { focusFirstIssue } from "@/lib/admin/field-issue";
import { getMusicWorkRepository } from "@/lib/admin/music-work-repository";

import type { FieldIssue } from "@/lib/admin/field-issue";
import type { MusicWorkInput } from "@/lib/supabase/music";
import type { ImageMeta } from "@/types/image";
import type { MusicWork } from "@/types/music";

const useWorkEditor = (workId: string, initial?: MusicWork) => {
  const router = useRouter();
  const isEdit = initial != null;
  const [form, setForm] = useState<MusicWorkInput>(() =>
    initial ? workToInput(initial) : emptyWorkInput(),
  );
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const { dirty, confirmLeave, markSaved, recovery, clearRecovery } = useEditorSession(
    "musicWorks",
    workId,
    form,
    {
      // JSON 은 Date 를 담지 못한다. 폼이 곧바로 쓰도록 되돌린다.
      revive: (input) => ({
        ...(input as unknown as MusicWorkInput),
        performedAt: new Date(input.performedAt as string),
      }),
    },
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const initialPaths = useRef(new Set(imagePaths([initial?.poster])));
  const uploadedPaths = useRef(new Set<string>());

  const applyForm = (next: typeof form) => setForm(next);

  const patch = (next: Partial<MusicWorkInput>) =>
    setForm((previous) => ({ ...previous, ...next }));
  const addProgram = () =>
    setForm((previous) => ({ ...previous, program: [...previous.program, ""] }));
  const editProgram = (index: number, value: string) =>
    setForm((previous) => ({
      ...previous,
      program: previous.program.map((piece, itemIndex) => (itemIndex === index ? value : piece)),
    }));
  const removeProgram = (index: number) =>
    setForm((previous) => ({
      ...previous,
      program: previous.program.filter((_, itemIndex) => itemIndex !== index),
    }));
  const onPosterChange = (poster: ImageMeta | null) => {
    for (const path of imagePaths([poster])) {
      if (!initialPaths.current.has(path)) uploadedPaths.current.add(path);
    }
    patch({ poster: poster ?? { url: "", path: "", w: 0, h: 0 } });
  };
  const onUploadPendingChange = useCallback((pending: boolean) => setUploading(pending), []);
  const cancel = async () => {
    if (!confirmLeave()) return;
    clearRecovery();
    await removeUnreferencedImages(uploadedPaths.current, []).catch(() => undefined);
    router.replace(ROUTES.ADMIN_MUSIC_WORKS);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const nextIssues = validateWorkInput(form);
    setIssues(nextIssues);
    if (nextIssues.length > 0) {
      focusFirstIssue(formRef.current, nextIssues);
      return;
    }

    setSaving(true);
    try {
      const input = prepareWorkInput(form);
      const workRepository = getMusicWorkRepository();
      if (isEdit) await workRepository.update(workId, input);
      else await workRepository.create(workId, input);
      await removeUnreferencedImages(
        [...initialPaths.current, ...uploadedPaths.current],
        imagePaths([input.poster]),
      ).catch(() => undefined);
      markSaved(form);
      clearRecovery();
      router.replace(ROUTES.ADMIN_MUSIC_WORKS);
    } catch (caught) {
      setError((caught as Error).message);
      setSaving(false);
    }
  };

  return {
    recovery,
    applyForm,
    dirty,
    form,
    issues,
    formRef,
    isEdit,
    error,
    saving,
    uploading,
    patch,
    addProgram,
    editProgram,
    removeProgram,
    onPosterChange,
    onUploadPendingChange,
    cancel,
    submit,
  };
};

export { useWorkEditor };
