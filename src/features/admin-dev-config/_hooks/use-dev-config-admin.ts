"use client";

import { useCallback, useEffect, useState } from "react";

import { useFormDirty } from "@/features/admin-shell/_hooks/use-form-dirty";
import { useFormRecovery } from "@/features/admin-shell/_hooks/use-form-recovery";


import {
  editDevConfig,
  type DevConfigEdit,
} from "@/features/admin-dev-config/_lib/edit-dev-config";

import { getDevConfigRepository } from "@/lib/admin/dev-config-repository";
import { formRecoverySlot } from "@/lib/admin/form-recovery";
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
 * 저장소의 set 이 문서를 통째로 덮어쓰므로 필드 유실이 없다.
 *
 * @returns {{ config: DevConfig; status: Status; error: string | null; saving: boolean; saved: boolean; edit: (command: DevConfigEdit) => void; save: () => Promise<void> }}
 */
const useDevConfigAdmin = () => {
  const [config, setConfig] = useState<DevConfig>(EMPTY);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { dirty, confirmLeave, markSaved } = useFormDirty(config);
  const recovery = useFormRecovery(formRecoverySlot("devConfig", "devConfig"), config, dirty);
  const { clear: clearRecovery } = recovery;

  useEffect(() => {
    let alive = true;
    getDevConfigRepository()
      .get()
      .then((loaded) => {
        if (!alive) return;
        setConfig(loaded);
        markSaved(loaded);
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

  const edit = useCallback((command: DevConfigEdit) => {
    setConfig((current) => editDevConfig(current, command));
    setSaved(false);
  }, []);

  const save = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      await getDevConfigRepository().set(config);
      setSaved(true);
      markSaved(config);
      clearRecovery();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }, [config, markSaved, clearRecovery]);

  return {
    confirmLeave,
    recovery,
    applyRecovered: setConfig,
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
