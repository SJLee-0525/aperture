"use client";

import { useCallback, useEffect, useState } from "react";

import { getSiteConfig, updateSiteConfig } from "@/lib/firebase/site";
import type { LocalizedText } from "@/types/localized";
import type { SiteConfig, SiteLink } from "@/types/site";

type Status = "loading" | "ready" | "error";

const EMPTY_LINK: SiteLink = { label: "", href: "" };

/**
 * 관리자 전역(랜딩·연락) 상태 관리 — tagline(순환 타이핑)·landingLead·contactLead·links 편집.
 * site/config 전체를 로드해 두고 이 필드만 교체해 저장한다(name·bio·tags 는 로드값 보존 — 문서 공유).
 * 페이지 컴포넌트는 이 훅이 돌려주는 값만 렌더한다(SRP).
 */
const useGlobalAdmin = () => {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [tagline, setTagline] = useState<LocalizedText>({ ko: "", en: "" });
  const [landingLead, setLandingLead] = useState<LocalizedText>({ ko: "", en: "" });
  const [contactLead, setContactLead] = useState<LocalizedText>({ ko: "", en: "" });
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
        setTagline(loaded.tagline);
        setLandingLead(loaded.landingLead);
        setContactLead(loaded.contactLead);
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

  const editTagline = useCallback((field: "ko" | "en", value: string) => {
    setTagline((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }, []);
  const editLandingLead = useCallback((field: "ko" | "en", value: string) => {
    setLandingLead((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }, []);
  const editContactLead = useCallback((field: "ko" | "en", value: string) => {
    setContactLead((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }, []);

  const addLink = useCallback(() => {
    setLinks((prev) => [...prev, { ...EMPTY_LINK }]);
    setSaved(false);
  }, []);
  const editLink = useCallback((index: number, field: keyof SiteLink, value: string) => {
    setLinks((prev) => prev.map((link, i) => (i === index ? { ...link, [field]: value } : link)));
    setSaved(false);
  }, []);
  const removeLink = useCallback((index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
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
    setSaved(false);
  }, []);

  /** 로드한 전체 설정에서 편집 필드만 교체(name·bio·tags 유지)해 저장. */
  const save = useCallback(async () => {
    if (!config) return;
    setError(null);
    setSaving(true);
    try {
      const next: SiteConfig = { ...config, tagline, landingLead, contactLead, links };
      await updateSiteConfig(next);
      setConfig(next);
      setSaved(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }, [config, tagline, landingLead, contactLead, links]);

  return {
    tagline,
    landingLead,
    contactLead,
    links,
    status,
    error,
    saving,
    saved,
    editTagline,
    editLandingLead,
    editContactLead,
    addLink,
    editLink,
    removeLink,
    moveLink,
    save,
  };
};

export { useGlobalAdmin };
