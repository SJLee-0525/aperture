"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useEffect, useState } from "react";

import { getSiteConfig, updateSiteConfig } from "@/lib/firebase/site";
import type { SiteConfig } from "@/types/site";
import type { Tag } from "@/types/tag";

type Status = "loading" | "ready" | "error";

/**
 * 관리자 태그 사전 상태 관리 — 로드·편집·추가·삭제·드래그 정렬·저장.
 * 전체 SiteConfig 를 보관하고 tags 만 편집한 뒤, 저장 시 나머지 필드를 그대로 넘겨
 * 다른 섹션(이름·바이오·링크)의 값이 유실되지 않게 한다.
 * 페이지 컴포넌트는 이 훅이 돌려주는 값만 렌더한다(SRP).
 */
const useTagsAdmin = () => {
  // 로드한 전체 설정(이름·바이오·링크 보존용). tags 는 아래 별도 상태에서 편집.
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    getSiteConfig()
      .then((loaded) => {
        if (!alive) return;
        setConfig(loaded);
        setTags(loaded.tags);
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
  }, []);

  /** 편집이 일어나면 "저장됨" 표시를 해제. */
  const markDirty = () => setSaved(false);

  /** id 는 사진이 참조하는 키라 수정 불가 — ko/en 만 편집. */
  const editLabel = useCallback((id: string, field: "ko" | "en", value: string) => {
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
    markDirty();
  }, []);

  /** 새 태그 추가 — id 슬러그 필수·중복 금지. 실패 시 한국어 사유를 반환. */
  const addTag = useCallback(
    (draft: Tag): string | null => {
      const id = draft.id.trim();
      if (id === "") return "태그 id(영문 슬러그)를 입력하세요.";
      if (tags.some((t) => t.id === id)) return `이미 "${id}" 태그가 있습니다.`;

      setTags((prev) => [...prev, { id, ko: draft.ko.trim(), en: draft.en.trim() }]);
      markDirty();
      return null;
    },
    [tags],
  );

  /** 태그 삭제 — 사진의 tags 배열엔 남을 수 있음(경고는 UI 에서). */
  const removeTag = useCallback((id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
    markDirty();
  }, []);

  /** 드래그 종료 → 배열 순서 재배열(공개 필터 칩 표시 순서 = 이 순서). */
  const reorder = useCallback((activeId: string, overId: string) => {
    if (activeId === overId) return;
    setTags((prev) => {
      const from = prev.findIndex((t) => t.id === activeId);
      const to = prev.findIndex((t) => t.id === overId);
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
    });
    markDirty();
  }, []);

  /** 로드한 전체 설정에서 tags 만 교체해 저장. */
  const save = useCallback(async () => {
    if (!config) return;
    setError(null);
    setSaving(true);
    try {
      await updateSiteConfig({ ...config, tags });
      setConfig((prev) => (prev ? { ...prev, tags } : prev));
      setSaved(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }, [config, tags]);

  return { tags, status, error, saving, saved, editLabel, addTag, removeTag, reorder, save };
};

export { useTagsAdmin };
