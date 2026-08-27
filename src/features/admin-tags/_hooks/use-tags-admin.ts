"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useEffect, useRef, useState } from "react";

import { useConfigDirty } from "@/features/admin-shell/_hooks/use-config-dirty";
import { useFormRecovery } from "@/features/admin-shell/_hooks/use-form-recovery";

import { getPhotoRepository } from "@/lib/admin/photo-repository";
import { getSiteConfigRepository } from "@/lib/admin/site-config-repository";

import type { Tag } from "@/types/tag";

type Status = "loading" | "ready" | "error";

/**
 * 관리자 태그 사전 상태 관리 — 로드·편집·추가·삭제·드래그 정렬·저장.
 * 저장 시 이 화면이 소유한 tags만 병합해 다른 설정 화면의 최신 값을 보존한다.
 * 페이지 컴포넌트는 이 훅이 돌려주는 값만 렌더한다(SRP).
 *
 * @returns {{ tags: Tag[]; status: Status; error: string | null; saving: boolean; saved: boolean; editLabel: (id: string, field: 'ko' | 'en', value: string) => void; addTag: (draft: Tag) => string | null; removeTag: (id: string) => void; reorder: (activeId: string, overId: string) => void; save: () => Promise<void> }}
 */
const useTagsAdmin = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  // 중복 검사가 봐야 하는 값은 직전 렌더의 tags 가 아니라 지금까지 적용된 목록이다.
  // setTags 의 updater 는 렌더 단계에 호출될 수 있어 결과를 곧바로 읽을 수 없다.
  const tagsRef = useRef<Tag[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { dirty, confirmLeave, markSaved } = useConfigDirty(tags);
  const recovery = useFormRecovery("photoTags", "photoTags", tags, dirty);
  const { clear: clearRecovery } = recovery;
  // 사전에 없는 id 가 사진에 남으면 공개 필터 칩과 사진 데이터가 어긋난다.
  // 블로그 태그 패널과 같은 정책으로, 쓰이는 태그는 삭제를 잠근다.
  const [usage, setUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    getPhotoRepository()
      .list()
      .then((photos) => {
        if (!alive) return;
        const counts: Record<string, number> = {};
        for (const photo of photos) {
          for (const id of photo.tags) counts[id] = (counts[id] ?? 0) + 1;
        }
        setUsage(counts);
      })
      // 사용 수를 세지 못하면 잠그지 못할 뿐 편집은 계속한다.
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    getSiteConfigRepository()
      .get()
      .then((loaded) => {
        if (!alive) return;
        tagsRef.current = loaded.tags;
        setTags(loaded.tags);
        markSaved(loaded.tags);
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

  /** tagsRef 와 상태를 함께 갱신한다. 두 값이 갈리면 중복 검사가 잘못된 목록을 본다. */
  const applyTags = useCallback((next: (prev: Tag[]) => Tag[]) => {
    const value = next(tagsRef.current);
    tagsRef.current = value;
    setTags(value);
  }, []);

  /** id 는 사진이 참조하는 키라 수정 불가 — ko/en 만 편집. */
  const editLabel = useCallback(
    (id: string, field: "ko" | "en", value: string) => {
      applyTags((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
      markDirty();
    },
    [applyTags],
  );

  /** 새 태그 추가 — id 슬러그 필수·중복 금지. 실패 시 한국어 사유를 반환. */
  const addTag = useCallback(
    (draft: Tag): string | null => {
      const id = draft.id.trim();
      if (id === "") return "태그 id(영문 슬러그)를 입력하세요.";
      // 엔터 연타처럼 한 틱에 두 번 호출돼도 두 번째가 첫 번째 추가를 본다.
      if (tagsRef.current.some((t) => t.id === id)) return `이미 "${id}" 태그가 있습니다.`;

      applyTags((prev) => [...prev, { id, ko: draft.ko.trim(), en: draft.en.trim() }]);
      markDirty();
      return null;
    },
    [applyTags],
  );

  /** 태그 삭제 — 사진의 tags 배열엔 남을 수 있음(경고는 UI 에서). */
  const removeTag = useCallback(
    (id: string) => {
      applyTags((prev) => prev.filter((t) => t.id !== id));
      markDirty();
    },
    [applyTags],
  );

  /** 드래그 종료 → 배열 순서 재배열(공개 필터 칩 표시 순서 = 이 순서). */
  const reorder = useCallback(
    (activeId: string, overId: string) => {
      if (activeId === overId) return;
      applyTags((prev) => {
        const from = prev.findIndex((t) => t.id === activeId);
        const to = prev.findIndex((t) => t.id === overId);
        if (from < 0 || to < 0) return prev;
        return arrayMove(prev, from, to);
      });
      markDirty();
    },
    [applyTags],
  );

  /** 이 화면이 소유한 tags만 저장한다. */
  const save = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      await getSiteConfigRepository().updateFields({ tags });
      setSaved(true);
      markSaved(tags);
      clearRecovery();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }, [tags, markSaved, clearRecovery]);

  return {
    confirmLeave,
    recovery,
    applyRecovered: setTags,
    usage,
    tags,
    status,
    error,
    saving,
    saved,
    editLabel,
    addTag,
    removeTag,
    reorder,
    save,
  };
};

export { useTagsAdmin };
