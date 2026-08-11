"use client";

import { memo } from "react";

import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";
import { useLang } from "@/features/lang/_hooks/use-lang";

import styles from "./ChatPanel.module.css";

import type { UIDict } from "@/constants/dictionary";
import type { ChatSentContext as SentContext } from "@/types/chat";

type Props = { context: SentContext; onNavigate: () => void };

const SENT_CONTEXT_LABELS: Record<SentContext["type"], (dict: UIDict) => string> = {
  photo: (dict) => dict.chatSentContextPhoto,
  work: (dict) => dict.chatSentContextWork,
  award: (dict) => dict.chatSentContextAward,
  project: (dict) => dict.chatSentContextProject,
};

/** 사용자 메시지가 어떤 화면 항목과 함께 전송됐는지 읽기 전용으로 표시한다. */
const ChatSentContext = memo(({ context, onNavigate }: Props) => {
  const { dict } = useLang();
  const typeLabel = SENT_CONTEXT_LABELS[context.type](dict);

  return (
    <LocalizedLink
      className={styles.sentContext}
      href={context.href}
      scroll={false}
      prefetch={false}
      onClick={onNavigate}
      aria-label={`${typeLabel}: ${context.label}`}
    >
      <span className={styles.sentContextType} aria-hidden="true">
        {typeLabel}
      </span>
      <strong className={styles.sentContextLabel} aria-hidden="true">
        {context.label}
      </strong>
    </LocalizedLink>
  );
});

ChatSentContext.displayName = "ChatSentContext";

export { ChatSentContext };
