"use client";

import { useCallback, useEffect, useState } from "react";

import { getSiteConfig, updateSiteConfig } from "@/lib/firebase/site";
import type { LocalizedText } from "@/types/localized";
import type { SiteConfig, SiteLink } from "@/types/site";

type Status = "loading" | "ready" | "error";

const EMPTY_LINK: SiteLink = { label: "", href: "" };

/**
 * 관리자 소개(site) 상태 관리 — 이름·바이오·링크 편집 + 저장.
 * 전체 SiteConfig 를 보관하고 name·bio·links 만 편집한다. tags 는 로드한 값을
 * 그대로 두었다가 저장 시 함께 넘겨 유실을 막는다(태그 사전 CMS 와 문서 공유).
 * 페이지 컴포넌트는 이 훅이 돌려주는 값만 렌더한다(SRP).
 */
const useSiteAdmin = () => {
  // 로드한 전체 설정(tags 보존용). 편집 대상은 아래 name·bio·links 별도 상태.
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [name, setName] = useState<LocalizedText>({ ko: "", en: "" });
  const [bio, setBio] = useState<LocalizedText>({ ko: "", en: "" });
  const [links, setLinks] = useState<SiteLink[]>([]);
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
        setName(loaded.name);
        setBio(loaded.bio);
        setLinks(loaded.links);
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

  const markDirty = () => setSaved(false);

  const editName = useCallback((field: "ko" | "en", value: string) => {
    setName((prev) => ({ ...prev, [field]: value }));
    markDirty();
  }, []);

  const editBio = useCallback((field: "ko" | "en", value: string) => {
    setBio((prev) => ({ ...prev, [field]: value }));
    markDirty();
  }, []);

  const addLink = useCallback(() => {
    setLinks((prev) => [...prev, { ...EMPTY_LINK }]);
    markDirty();
  }, []);

  const editLink = useCallback((index: number, field: keyof SiteLink, value: string) => {
    setLinks((prev) => prev.map((link, i) => (i === index ? { ...link, [field]: value } : link)));
    markDirty();
  }, []);

  const removeLink = useCallback((index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  }, []);

  /** 위/아래 버튼 순서 이동(offset: -1 위, +1 아래). */
  const moveLink = useCallback((index: number, offset: -1 | 1) => {
    setLinks((prev) => {
      const target = index + offset;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    markDirty();
  }, []);

  /** 로드한 전체 설정에서 name·bio·links 만 교체(tags 유지)해 저장. */
  const save = useCallback(async () => {
    if (!config) return;
    setError(null);
    setSaving(true);
    try {
      const next: SiteConfig = { ...config, name, bio, links };
      await updateSiteConfig(next);
      setConfig(next);
      setSaved(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }, [config, name, bio, links]);

  return {
    name,
    bio,
    links,
    status,
    error,
    saving,
    saved,
    editName,
    editBio,
    addLink,
    editLink,
    removeLink,
    moveLink,
    save,
  };
};

export { useSiteAdmin };
