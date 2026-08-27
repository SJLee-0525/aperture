"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  emptyMediaInput,
  mediaToInput,
  prepareMediaInput,
} from "@/features/admin-music-media/_lib/media-form-data";
import { validateMediaInput } from "@/features/admin-music-media/_lib/validate-media-input";

import { ROUTES } from "@/constants/routes";
import { getMusicMediaRepository } from "@/lib/admin/music-media-repository";

import type { MusicMediaInput } from "@/lib/supabase/music";
import type { MusicMedia } from "@/types/music";

const useMediaEditor = (mediaId: string, initial?: MusicMedia) => {
  const router = useRouter();
  const isEdit = initial != null;
  const [form, setForm] = useState<MusicMediaInput>(() =>
    initial ? mediaToInput(initial) : emptyMediaInput(),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const patch = (next: Partial<MusicMediaInput>) =>
    setForm((previous) => ({ ...previous, ...next }));

  const cancel = () => router.replace(ROUTES.ADMIN_MUSIC_MEDIA);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const validationError = validateMediaInput(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const input = prepareMediaInput(form);
      const mediaRepository = getMusicMediaRepository();
      if (isEdit) await mediaRepository.update(mediaId, input);
      else await mediaRepository.create(mediaId, input);
      router.replace(ROUTES.ADMIN_MUSIC_MEDIA);
    } catch (caught) {
      setError((caught as Error).message);
      setSaving(false);
    }
  };

  return { form, isEdit, error, saving, patch, cancel, submit };
};

export { useMediaEditor };
