"use client";

import { useEffect } from "react";

import { takeContactDraft } from "@/lib/contact-draft-storage";

import type { RefObject } from "react";

type DraftTargets = {
  nameRef: RefObject<HTMLInputElement | null>;
  emailRef: RefObject<HTMLInputElement | null>;
  messageRef: RefObject<HTMLTextAreaElement | null>;
};

/**
 * 마운트 후 연락 초안을 한 번 읽어 비어 있는 uncontrolled input에 넣는다.
 * sessionStorage는 hydration이 끝난 뒤 effect에서만 읽는다.
 *
 * @param {DraftTargets} targets
 * @returns {void} 반환값 없음.
 */
const useContactDraft = ({ nameRef, emailRef, messageRef }: DraftTargets): void => {
  useEffect(() => {
    // sessionStorage 프로퍼티 접근 자체가 throw하는 환경(비공개 모드 등)에서는
    // 초안 없이 일반 연락 폼으로 동작한다.
    let storage: Pick<Storage, "getItem" | "removeItem">;
    try {
      storage = window.sessionStorage;
    } catch {
      return;
    }
    const draft = takeContactDraft(storage);
    if (!draft) return;

    const targets: ReadonlyArray<[HTMLInputElement | HTMLTextAreaElement | null, string]> = [
      [nameRef.current, draft.name],
      [emailRef.current, draft.email],
      [messageRef.current, draft.message],
    ];
    // 방문자가 이미 입력한 값은 덮어쓰지 않는다.
    for (const [element, value] of targets) {
      if (element && value && !element.value) element.value = value;
    }
    // 첫 번째 빈 칸으로 이동한다. 모든 칸이 차 있으면 메시지에 둔다.
    const firstEmpty = targets.find(([element]) => element && !element.value)?.[0];
    (firstEmpty ?? messageRef.current)?.focus();
  }, [nameRef, emailRef, messageRef]);
};

export { useContactDraft };
