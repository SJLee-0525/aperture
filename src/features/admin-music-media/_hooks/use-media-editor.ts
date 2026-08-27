"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { useFormRecovery } from "@/features/admin-shell/_hooks/use-form-recovery";
import { useUnsavedForm } from "@/features/admin-shell/_hooks/use-unsaved-form";

import {
  emptyMediaInput,
  mediaToInput,
  prepareMediaInput,
} from "@/features/admin-music-media/_lib/media-form-data";
import { validateMediaInput } from "@/features/admin-music-media/_lib/validate-media-input";

import { ROUTES } from "@/constants/routes";
import { focusFirstIssue } from "@/lib/admin/field-issue";
import { formFingerprint } from "@/lib/admin/form-fingerprint";
import { formRecoverySlot } from "@/lib/admin/form-recovery";
import { getMusicMediaRepository } from "@/lib/admin/music-media-repository";

import type { FieldIssue } from "@/lib/admin/field-issue";
import type { MusicMediaInput } from "@/lib/supabase/music";
import type { MusicMedia } from "@/types/music";

const useMediaEditor = (mediaId: string, initial?: MusicMedia) => {
  const router = useRouter();
  const isEdit = initial != null;
  const [form, setForm] = useState<MusicMediaInput>(() =>
    initial ? mediaToInput(initial) : emptyMediaInput(),
  );
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const [savedFingerprint, setSavedFingerprint] = useState(() => formFingerprint(form));
  const dirty = formFingerprint(form) !== savedFingerprint;
  const confirmLeave = useUnsavedForm(dirty);
  const recovery = useFormRecovery(formRecoverySlot("musicMedia", mediaId), form, dirty);
  const { clear: clearRecovery } = recovery;
  const [saving, setSaving] = useState(false);

  const applyForm = (next: typeof form) => setForm(next);

  const patch = (next: Partial<MusicMediaInput>) =>
    setForm((previous) => ({ ...previous, ...next }));

  const cancel = () => {
    if (!confirmLeave()) return;
    clearRecovery();
    router.replace(ROUTES.ADMIN_MUSIC_MEDIA);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const nextIssues = validateMediaInput(form);
    setIssues(nextIssues);
    if (nextIssues.length > 0) {
      focusFirstIssue(formRef.current, nextIssues);
      return;
    }

    setSaving(true);
    try {
      const input = prepareMediaInput(form);
      const mediaRepository = getMusicMediaRepository();
      if (isEdit) await mediaRepository.update(mediaId, input);
      else await mediaRepository.create(mediaId, input);
      setSavedFingerprint(formFingerprint(form));
      clearRecovery();
      router.replace(ROUTES.ADMIN_MUSIC_MEDIA);
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
    patch,
    cancel,
    submit,
  };
};

export { useMediaEditor };
