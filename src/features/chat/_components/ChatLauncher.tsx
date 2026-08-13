"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Icon } from "@/components/Icon";

import { useLang } from "@/features/lang/_hooks/use-lang";

import styles from "./ChatLauncher.module.css";

const ChatPanel = dynamic(() => import("./ChatPanel").then((module) => module.ChatPanel));

const ChatLauncher = () => {
  const { dict } = useLang();
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
        aria-label={dict.chatOpenLabel}
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
