"use client";

import { useCallback, useState } from "react";

import { useUnsavedForm } from "@/features/admin-shell/_hooks/use-unsaved-form";

import { formFingerprint } from "@/lib/admin/form-fingerprint";

/**
 * 설정 편집기의 dirty 추적. 불러온 값과 현재 값의 지문을 비교한다.
 *
 * 편집기들이 갖고 있는 `saved` 는 저장 성공 표시라 dirty 의 반대가 아니다. 처음 불러온
 * 직후에도 false 이므로 이탈 경고의 조건으로 쓸 수 없다.
 *
 * @param value 현재 편집 중인 값 전체.
 * @returns `markSaved` 로 기준 지문을 갱신하고, `confirmLeave` 로 이동 여부를 묻는다.
 */
const useConfigDirty = <T>(value: T) => {
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(null);
  const current = formFingerprint(value);
  // 불러오기 전에는 기준이 없다. 그때는 바뀐 것도 없다.
  const dirty = savedFingerprint !== null && current !== savedFingerprint;
  const confirmLeave = useUnsavedForm(dirty);

  const markSaved = useCallback((next: T) => setSavedFingerprint(formFingerprint(next)), []);

  return { dirty, confirmLeave, markSaved };
};

export { useConfigDirty };
