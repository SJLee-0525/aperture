"use client";

import { useCallback, useState } from "react";

import { useUnsavedForm } from "@/features/admin-shell/_hooks/use-unsaved-form";

import { formFingerprint } from "@/lib/admin/form-fingerprint";

type Options = {
  /**
   * 처음부터 기준 지문을 잡을지.
   *
   * 엔티티 폼은 초기값이 곧 저장본이라 바로 잡는다. 설정 편집기는 비동기로 불러오므로
   * 불러오기 전에는 기준이 없다 — 그때 잡으면 빈 값이 저장본이 되어 로드 직후가
   * 통째로 dirty 가 된다.
   */
  baseline?: boolean;
};

/**
 * 편집 폼의 dirty 추적. 저장본과 현재 값의 지문을 비교하고 셸 이탈 가드에 등록한다.
 *
 * 편집기가 갖고 있는 `saved` 는 저장 성공 표시라 dirty 의 반대가 아니다. 처음 불러온
 * 직후에도 false 이므로 이탈 경고의 조건으로 쓸 수 없다.
 *
 * @param value 현재 편집 중인 값 전체.
 * @param options `baseline` 으로 초기 기준 지문 여부를 정한다.
 * @returns `markSaved` 로 기준 지문을 갱신하고, `confirmLeave` 로 이동 여부를 묻는다.
 */
const useFormDirty = <T>(value: T, options: Options = {}) => {
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(() =>
    options.baseline ? formFingerprint(value) : null,
  );
  const current = formFingerprint(value);
  // 기준이 없으면 바뀐 것도 없다.
  const dirty = savedFingerprint !== null && current !== savedFingerprint;
  const confirmLeave = useUnsavedForm(dirty);

  const markSaved = useCallback((next: T) => setSavedFingerprint(formFingerprint(next)), []);

  return { dirty, confirmLeave, markSaved };
};

export { useFormDirty };
