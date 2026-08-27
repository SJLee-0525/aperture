"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { useUnsavedForm } from "@/features/admin-shell/_hooks/use-unsaved-form";

import {
  awardToInput,
  emptyAwardInput,
  prepareAwardInput,
} from "@/features/admin-music-awards/_lib/award-form-data";
import { validateAwardInput } from "@/features/admin-music-awards/_lib/validate-award-input";


import { ROUTES } from "@/constants/routes";
import { focusFirstIssue } from "@/lib/admin/field-issue";
import { formFingerprint } from "@/lib/admin/form-fingerprint";
import { getMusicAwardRepository } from "@/lib/admin/music-award-repository";

import type { AwardFormValue } from "@/features/admin-music-awards/_lib/award-form-data";
import type { FieldIssue } from "@/lib/admin/field-issue";
import type { MusicAward } from "@/types/music";

const useAwardEditor = (awardId: string, initial?: MusicAward) => {
  const router = useRouter();
  const isEdit = initial != null;
  const [form, setForm] = useState<AwardFormValue>(() =>
    initial ? awardToInput(initial) : emptyAwardInput(),
  );
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const [savedFingerprint, setSavedFingerprint] = useState(() => formFingerprint(form));
  const dirty = formFingerprint(form) !== savedFingerprint;
  const confirmLeave = useUnsavedForm(dirty);
  const [saving, setSaving] = useState(false);

  const patch = (next: Partial<AwardFormValue>) =>
    setForm((previous) => ({ ...previous, ...next }));

  const cancel = () => {
    if (!confirmLeave()) return;
    router.replace(ROUTES.ADMIN_MUSIC_AWARDS);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const nextIssues = validateAwardInput(form);
    setIssues(nextIssues);
    if (nextIssues.length > 0) {
      focusFirstIssue(formRef.current, nextIssues);
      return;
    }

    setSaving(true);
    try {
      const input = prepareAwardInput(form);
      const awardRepository = getMusicAwardRepository();
      if (isEdit) await awardRepository.update(awardId, input);
      else await awardRepository.create(awardId, input);
      setSavedFingerprint(formFingerprint(form));
      router.replace(ROUTES.ADMIN_MUSIC_AWARDS);
    } catch (caught) {
      setError((caught as Error).message);
      setSaving(false);
    }
  };

  return { dirty, form, issues, formRef, isEdit, error, saving, patch, cancel, submit };
};

export { useAwardEditor };
