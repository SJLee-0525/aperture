"use client";

import { useCallback, useEffect, useState } from "react";

import { useFormDirty } from "@/features/admin-shell/_hooks/use-form-dirty";
import { useFormRecovery } from "@/features/admin-shell/_hooks/use-form-recovery";

import { formRecoverySlot } from "@/lib/admin/form-recovery";
import { getSiteConfigRepository } from "@/lib/admin/site-config-repository";
import { moveItem } from "@/lib/collection/move-item";
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
  const { dirty, confirmLeave, markSaved } = useFormDirty({
    tagline,
    landingLead,
    contactLead,
    links,
  });
  const recovery = useFormRecovery(
    formRecoverySlot("globalConfig", "globalConfig"),
    { tagline, landingLead, contactLead, links },
    dirty,
  );
  const { clear: clearRecovery } = recovery;

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
    setLinks((prev) => moveItem(prev, index, offset));
    setSaved(false);
  }, []);

  /** 이 화면이 소유한 전역 필드만 저장한다. */
  const applyRecovered = (next: {
    tagline: LocalizedText;
    landingLead: LocalizedText;
    contactLead: LocalizedText;
    links: SiteLink[];
  }) => {
    setTagline(next.tagline);
    setLandingLead(next.landingLead);
    setContactLead(next.contactLead);
    setLinks(next.links);
  };

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
      clearRecovery();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }, [tagline, landingLead, contactLead, links, markSaved, clearRecovery]);

  return {
    confirmLeave,
    recovery,
    applyRecovered,
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
