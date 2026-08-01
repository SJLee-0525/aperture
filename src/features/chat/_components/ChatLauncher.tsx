"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Icon } from "@/components/Icon";
import { useLang } from "@/features/lang/_hooks/use-lang";

import styles from "./ChatLauncher.module.css";

const ChatPanel = dynamic(() => import("./ChatPanel").then((module) => module.ChatPanel));

const LABEL = {
  ko: "챗봇 열기",
  en: "Open chat",
} as const;

const ChatLauncher = () => {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const openChat = () => {
    setHasOpened(true);
    setOpen(true);
  };

  return (
    <>
      {hasOpened ? <ChatPanel open={open} onClose={() => setOpen(false)} /> : null}
      <button
        type="button"
        className={styles.launcher}
        aria-label={LABEL[lang]}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openChat}
      >
        <Icon name="sparkle" size={22} />
      </button>
    </>
  );
};

export { ChatLauncher };
