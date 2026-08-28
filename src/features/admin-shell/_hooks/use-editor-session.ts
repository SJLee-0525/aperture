"use client";

import { useFormDirty } from "@/features/admin-shell/_hooks/use-form-dirty";
import { useFormRecovery } from "@/features/admin-shell/_hooks/use-form-recovery";

import { formRecoverySlot } from "@/lib/admin/form-recovery";

type Options<T> = {
  /** JSON 이 문자열로 바꾼 Date 등을 폼 값으로 되돌린다. */
  revive?: (input: Record<string, unknown>) => T;
};

/**
 * 엔티티 편집 훅이 공유하는 dirty·이탈 가드·복구본 배선.
 *
 * 여섯 폼이 같은 다섯 줄을 각자 적고 있었다. 지문 기준을 언제 잡는지(엔티티는 초기값,
 * 설정 편집기는 비동기 로드 후)만 달라서 `useFormDirty` 의 `baseline` 이 그 차이를 받는다.
 *
 * @param collection 복구본 키의 컬렉션 이름.
 * @param id 편집 중인 문서 ID.
 * @param form 현재 폼 값.
 * @returns 저장 성공 시 `markSaved(form)` 과 `clearRecovery()` 를 함께 부른다.
 */
const useEditorSession = <T>(collection: string, id: string, form: T, options: Options<T> = {}) => {
  const { dirty, confirmLeave, markSaved } = useFormDirty(form, { baseline: true });
  const recovery = useFormRecovery(formRecoverySlot(collection, id), form, dirty, options);

  return { dirty, confirmLeave, markSaved, recovery, clearRecovery: recovery.clear };
};

export { useEditorSession };
