"use client";

import { useCallback, useEffect, useState } from "react";

import { getSiteConfig, updateSiteConfig } from "@/lib/firebase/site";
import type { LocalizedText } from "@/types/localized";
import type { SiteConfig } from "@/types/site";

type Status = "loading" | "ready" | "error";

/**
 * 사진 소개(/photo/about) 바이오 편집 상태 관리.
 * about 페이지가 노출하는 편집 대상은 **bio 뿐**이다(이름·연락 링크는 노출 안 함 → 전역/연락 CMS 소관, 추후).
 * 전체 SiteConfig 를 로드해 두었다가 저장 시 bio 만 교체하고 나머지(name·tagline·landingLead·links·tags)는
 * 로드값 그대로 넘겨 유실을 막는다(단일 config 문서 공유).
 * 페이지 컴포넌트는 이 훅이 돌려주는 값만 렌더한다(SRP).
 */
const useSiteAdmin = () => {
  // 로드한 전체 설정(bio 외 필드 보존용). 편집 대상은 bio 하나.
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [bio, setBio] = useState<LocalizedText>({ ko: "", en: "" });
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
        setBio(loaded.bio);
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

  const editBio = useCallback((field: "ko" | "en", value: string) => {
    setBio((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }, []);

  /** 로드한 전체 설정에서 bio 만 교체(나머지 유지)해 저장. */
  const save = useCallback(async () => {
    if (!config) return;
    setError(null);
    setSaving(true);
    try {
      const next: SiteConfig = { ...config, bio };
      await updateSiteConfig(next);
      setConfig(next);
      setSaved(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }, [config, bio]);

  return { bio, status, error, saving, saved, editBio, save };
};

export { useSiteAdmin };
