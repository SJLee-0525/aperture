"use client";

import { useCallback, useEffect, useState } from "react";

import { useFormDirty } from "@/features/admin-shell/_hooks/use-form-dirty";
import { useFormRecovery } from "@/features/admin-shell/_hooks/use-form-recovery";

import { formRecoverySlot } from "@/lib/admin/form-recovery";
import { getMusicConfigRepository } from "@/lib/admin/music-config-repository";
import { moveItem } from "@/lib/collection/move-item";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { LocalizedText } from "@/types/localized";
import type { MusicConfig } from "@/types/music";
import type { TimelineEntry } from "@/types/timeline";

type Status = "loading" | "ready" | "error";
/** career/education 두 타임라인 배열을 같은 로직으로 편집하기 위한 키. */
type TimelineKey = "career" | "education";

/**
 * 관리자 음악 설정(site/music) 상태 관리 — 소개글·경력·학력 편집 + 저장.
 * site.ts 와 동일하게 "전체 로드 → 편집 → 전체 저장" 흐름이라 필드 유실이 없다.
 * 페이지 컴포넌트는 이 훅이 돌려주는 값만 렌더한다(SRP).
 *
 * @returns {{ intro: LocalizedText; career: TimelineEntry[]; education: TimelineEntry[]; status: Status; error: string | null; saving: boolean; saved: boolean; editIntro: (field: 'ko' | 'en', value: string) => void; addEntry: (key: TimelineKey) => void; editPeriod: (key: TimelineKey, index: number, value: string) => void; editTitle: (key: TimelineKey, index: number, field: 'ko' | 'en', value: string) => void; removeEntry: (key: TimelineKey, index: number) => void; moveEntry: (key: TimelineKey, index: number, offset: -1 | 1) => void; save: () => Promise<void> }}
 */
const useMusicConfigAdmin = () => {
  const [intro, setIntro] = useState<LocalizedText>(EMPTY_TEXT);
  const [career, setCareer] = useState<TimelineEntry[]>([]);
  const [education, setEducation] = useState<TimelineEntry[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { dirty, confirmLeave, markSaved } = useFormDirty({ intro, career, education });
  const recovery = useFormRecovery(
    formRecoverySlot("musicConfig", "musicConfig"),
    { intro, career, education },
    dirty,
  );
  const { clear: clearRecovery } = recovery;

  useEffect(() => {
    let alive = true;
    getMusicConfigRepository()
      .get()
      .then((loaded) => {
        if (!alive) return;
        setIntro(loaded.intro);
        setCareer(loaded.career);
        setEducation(loaded.education);
        markSaved({ intro: loaded.intro, career: loaded.career, education: loaded.education });
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

  const markDirty = () => setSaved(false);

  const setterFor = (key: TimelineKey) => (key === "career" ? setCareer : setEducation);

  const editIntro = useCallback((field: "ko" | "en", value: string) => {
    setIntro((prev) => ({ ...prev, [field]: value }));
    markDirty();
  }, []);

  const addEntry = useCallback((key: TimelineKey) => {
    setterFor(key)((prev) => [...prev, { period: "", title: EMPTY_TEXT }]);
    markDirty();
  }, []);

  const editPeriod = useCallback((key: TimelineKey, index: number, value: string) => {
    setterFor(key)((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, period: value } : entry)),
    );
    markDirty();
  }, []);

  const editTitle = useCallback(
    (key: TimelineKey, index: number, field: "ko" | "en", value: string) => {
      setterFor(key)((prev) =>
        prev.map((entry, i) =>
          i === index ? { ...entry, title: { ...entry.title, [field]: value } } : entry,
        ),
      );
      markDirty();
    },
    [],
  );

  const removeEntry = useCallback((key: TimelineKey, index: number) => {
    setterFor(key)((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  }, []);

  /** 위/아래 버튼 순서 이동(offset: -1 위, +1 아래). */
  const moveEntry = useCallback((key: TimelineKey, index: number, offset: -1 | 1) => {
    setterFor(key)((prev) => moveItem(prev, index, offset));
    markDirty();
  }, []);

  const applyRecovered = (next: {
    intro: LocalizedText;
    career: TimelineEntry[];
    education: TimelineEntry[];
  }) => {
    setIntro(next.intro);
    setCareer(next.career);
    setEducation(next.education);
  };

  const save = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      const next: MusicConfig = { intro, career, education };
      await getMusicConfigRepository().set(next);
      setSaved(true);
      markSaved({ intro, career, education });
      clearRecovery();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }, [intro, career, education, markSaved, clearRecovery]);

  return {
    confirmLeave,
    recovery,
    applyRecovered,
    intro,
    career,
    education,
    status,
    error,
    saving,
    saved,
    editIntro,
    addEntry,
    editPeriod,
    editTitle,
    removeEntry,
    moveEntry,
    save,
  };
};

export { useMusicConfigAdmin };
export type { TimelineKey };
