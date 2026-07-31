"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Icon } from "@/components/Icon";
import { useLang } from "@/features/lang/_hooks/use-lang";

import styles from "./ChatLauncher.module.css";

const ChatPanel = dynamic(() => import("./ChatPanel").then((module) => module.ChatPanel));

const LABEL = {
  ko: "AI 안내 챗봇 열기",
  en: "Open AI guide",
} as const;

const ChatLauncher = () => {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <>
      {open ? <ChatPanel onClose={() => setOpen(false)} /> : null}
      <button
        type="button"
        className={styles.launcher}
        aria-label={LABEL[lang]}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Icon name="chat" size={22} />
      </button>
    </>
  );
};

export { ChatLauncher };
