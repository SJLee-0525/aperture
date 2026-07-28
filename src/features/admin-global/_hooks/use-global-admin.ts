"use client";

import { useCallback, useEffect, useState } from "react";

import { getSiteConfig, updateSiteConfigFields } from "@/lib/firebase/site";
import type { LocalizedText } from "@/types/localized";
import type { SiteLink } from "@/types/site";

type Status = "loading" | "ready" | "error";

const EMPTY_LINK: SiteLink = { label: "", href: "" };

/**
 * 관리자 전역(랜딩·연락) 상태 관리 — tagline(순환 타이핑)·landingLead·contactLead·links 편집.
 * site/config에서 편집 필드를 로드하고, 저장 시 이 화면이 소유한 필드만 병합한다.
 * 페이지 컴포넌트는 이 훅이 돌려주는 값만 렌더한다(SRP).
 */
const useGlobalAdmin = () => {
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

  /** 이 화면이 소유한 전역 필드만 저장한다. */
  const save = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      await updateSiteConfigFields({ tagline, landingLead, contactLead, links });
      setSaved(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }, [tagline, landingLead, contactLead, links]);

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
