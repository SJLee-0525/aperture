"use client";

import { useContext } from "react";

import { ChatScreenTargetContext } from "@/lib/chat-screen-target-context";

import type { ChatScreenTarget } from "@/lib/chat-screen-target-context";

/** @returns 현재 열린 상세 항목. Provider 밖에서는 `null`. */
const useChatScreenTarget = (): ChatScreenTarget | null =>
  useContext(ChatScreenTargetContext)?.target ?? null;

export { useChatScreenTarget };
