"use client";

import { useContext, useEffect } from "react";

import { ChatScreenTargetContext } from "@/lib/chat-screen-target-context";

import type { ChatScreenTarget } from "@/lib/chat-screen-target-context";

/**
 * 상세 모달이 열리면 항목을 등록하고 닫히면 자신이 등록한 값만 해제한다.
 *
 * @param {ChatScreenTarget | null} target 현재 상세 항목.
 * @returns {void}
 */
const useRegisterChatScreenTarget = (target: ChatScreenTarget | null): void => {
  const setTarget = useContext(ChatScreenTargetContext)?.setTarget;
  const type = target?.type;
  const id = target?.id;
  const label = target?.label;

  useEffect(() => {
    if (!setTarget || !type || !id || !label) return;
    setTarget({ type, id, label });
    return () => {
      setTarget((current) => (current?.type === type && current.id === id ? null : current));
    };
  }, [setTarget, type, id, label]);
};

export { useRegisterChatScreenTarget };
