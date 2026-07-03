"use client";

import { useCallback, useEffect, useState } from "react";

import { getDevConfigAdmin, updateDevConfig } from "@/lib/firebase/dev";
import type { DevConfig } from "@/types/dev";

type Status = "loading" | "ready" | "error";

const EMPTY: DevConfig = {
  heroLead: { ko: "", en: "" },
  interview: [],
  stack: [],
  timeline: [],
};

/**
 * 관리자 개발 설정(site/dev) 상태 관리 — 전체 로드 → 편집 → 전체 저장.
 * dev.ts 의 updateDevConfig 가 문서를 통째로 덮어쓰므로 필드 유실이 없다.
 * 페이지 컴포넌트는 이 훅이 돌려주는 config·setter 만 렌더한다(SRP).
 */
const useDevConfigAdmin = () => {
  const [config, setConfig] = useState<DevConfig>(EMPTY);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    getDevConfigAdmin()
      .then((loaded) => {
        if (!alive) return;
        setConfig(loaded);
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

  /** 부분 갱신 — 어떤 필드든 이 하나로 편집하고 저장 상태를 dirty 로 되돌린다. */
  const patch = useCallback((next: Partial<DevConfig>) => {
    setConfig((prev) => ({ ...prev, ...next }));
    setSaved(false);
  }, []);

  const save = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      await updateDevConfig(config);
      setSaved(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }, [config]);

  return { config, status, error, saving, saved, patch, save };
};

export { useDevConfigAdmin };
