"use client";

import { useCallback, useEffect, useState } from "react";

import { useConfigDirty } from "@/features/admin-shell/_hooks/use-config-dirty";
import { useFormRecovery } from "@/features/admin-shell/_hooks/use-form-recovery";

import { getSiteConfigRepository } from "@/lib/admin/site-config-repository";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { LocalizedText } from "@/types/localized";

type Status = "loading" | "ready" | "error";

/**
 * 사진 소개(/photo/about) 바이오 편집 상태 관리.
 * about 페이지가 노출하는 편집 대상은 **bio 뿐**이다(이름·연락 링크는 노출 안 함 → 전역/연락 CMS 소관, 추후).
 * 저장 시 이 화면이 소유한 bio만 병합해 단일 config 문서의 다른 필드를 건드리지 않는다.
 * 페이지 컴포넌트는 이 훅이 돌려주는 값만 렌더한다(SRP).
 *
 * @returns {{ bio: LocalizedText; status: Status; error: string | null; saving: boolean; saved: boolean; editBio: (field: 'ko' | 'en', value: string) => void; save: () => Promise<void> }}
 */
const useSiteAdmin = () => {
  const [bio, setBio] = useState<LocalizedText>(EMPTY_TEXT);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { dirty, confirmLeave, markSaved } = useConfigDirty(bio);
  const recovery = useFormRecovery("siteBio", "siteBio", bio, dirty);
  const { clear: clearRecovery } = recovery;

  useEffect(() => {
    let alive = true;
    getSiteConfigRepository()
      .get()
      .then((loaded) => {
        if (!alive) return;
        setBio(loaded.bio);
        markSaved(loaded.bio);
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
  }, [markSaved]);

  const editBio = useCallback((field: "ko" | "en", value: string) => {
    setBio((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }, []);

  /** 이 화면이 소유한 bio만 저장한다. */
  const save = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      await getSiteConfigRepository().updateFields({ bio });
      setSaved(true);
      markSaved(bio);
      clearRecovery();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }, [bio, markSaved, clearRecovery]);

  return {
    confirmLeave,
    recovery,
    applyRecovered: setBio,
    bio,
    status,
    error,
    saving,
    saved,
    editBio,
    save,
  };
};

export { useSiteAdmin };
