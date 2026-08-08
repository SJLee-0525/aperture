"use client";

import { useCallback, useEffect, useState } from "react";

import {
  editDevConfig,
  type DevConfigEdit,
} from "@/features/admin-dev-config/_lib/edit-dev-config";

import { getDevConfigAdmin, updateDevConfig } from "@/lib/firebase/dev";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { DevConfig } from "@/types/dev";

type Status = "loading" | "ready" | "error";

const EMPTY: DevConfig = {
  heroLead: EMPTY_TEXT,
  interview: [],
  stack: [],
  education: [],
  timeline: [],
  awards: [],
};

/**
 * 관리자 개발 설정(site/dev)의 로드·저장 lifecycle과 편집 상태 연결.
 * dev.ts 의 updateDevConfig 가 문서를 통째로 덮어쓰므로 필드 유실이 없다.
 *
 * @returns {{ config: DevConfig; status: Status; error: string | null; saving: boolean; saved: boolean; edit: (command: DevConfigEdit) => void; save: () => Promise<void> }}
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

  const edit = useCallback((command: DevConfigEdit) => {
    setConfig((current) => editDevConfig(current, command));
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

  return {
    config,
    status,
    error,
    saving,
    saved,
    edit,
    save,
  };
};

export { useDevConfigAdmin };
