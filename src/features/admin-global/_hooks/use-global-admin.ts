"use client";

import { useCallback, useEffect, useState } from "react";

import { useConfigDirty } from "@/features/admin-shell/_hooks/use-config-dirty";

import { getSiteConfigRepository } from "@/lib/admin/site-config-repository";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";
import { preparePublicLinks } from "@/lib/security/public-url";

import type { LocalizedText } from "@/types/localized";
import type { SiteLink } from "@/types/site";

type Status = "loading" | "ready" | "error";

const EMPTY_LINK: SiteLink = { label: "", href: "" };

/**
 * 관리자 전역(랜딩·연락) 상태 관리 — tagline(순환 타이핑)·landingLead·contactLead·links 편집.
 * site/config에서 편집 필드를 로드하고, 저장 시 이 화면이 소유한 필드만 병합한다.
 * 페이지 컴포넌트는 이 훅이 돌려주는 값만 렌더한다(SRP).
 *
 * @returns {{ tagline: LocalizedText; landingLead: LocalizedText; contactLead: LocalizedText; links: SiteLink[]; status: Status; error: string | null; saving: boolean; saved: boolean; editTagline: (field: 'ko' | 'en', value: string) => void; editLandingLead: (field: 'ko' | 'en', value: string) => void; editContactLead: (field: 'ko' | 'en', value: string) => void; addLink: () => void; editLink: (index: number, field: keyof SiteLink, value: string) => void; removeLink: (index: number) => void; moveLink: (index: number, offset: -1 | 1) => void; save: () => Promise<void> }}
 */
const useGlobalAdmin = () => {
  const [tagline, setTagline] = useState<LocalizedText>(EMPTY_TEXT);
  const [landingLead, setLandingLead] = useState<LocalizedText>(EMPTY_TEXT);
  const [contactLead, setContactLead] = useState<LocalizedText>(EMPTY_TEXT);
  const [links, setLinks] = useState<SiteLink[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { confirmLeave, markSaved } = useConfigDirty({ tagline, landingLead, contactLead, links });

  useEffect(() => {
    let alive = true;
    getSiteConfigRepository()
      .get()
      .then((loaded) => {
        if (!alive) return;
        setTagline(loaded.tagline);
        setLandingLead(loaded.landingLead);
        setContactLead(loaded.contactLead);
        setLinks(loaded.links);
        markSaved({
          tagline: loaded.tagline,
          landingLead: loaded.landingLead,
          contactLead: loaded.contactLead,
          links: loaded.links,
        });
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
      const preparedLinks = preparePublicLinks(links, { allowMailto: true });
      await getSiteConfigRepository().updateFields({
        tagline,
        landingLead,
        contactLead,
        links: preparedLinks,
      });
      setLinks(preparedLinks);
      setSaved(true);
      markSaved({ tagline, landingLead, contactLead, links });
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }, [tagline, landingLead, contactLead, links, markSaved]);

  return {
    confirmLeave,
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
