"use client";

import { type FormEvent, memo } from "react";

import { Icon } from "@/components/Icon";

import styles from "./ChatPanel.module.css";

type Props = {
  inputLabel: string;
  placeholder: string;
  sendLabel: string;
  isReplying: boolean;
  onSend: (message: string) => boolean;
};

/** 타이핑 값을 DOM에 유지해 입력마다 패널과 전송 버튼을 다시 렌더하지 않는다. */
const ChatComposer = memo(({ inputLabel, placeholder, sendLabel, isReplying, onSend }: Props) => {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = String(new FormData(event.currentTarget).get("message") ?? "");
    if (!onSend(message)) return;

    const textarea = event.currentTarget.elements.namedItem("message") as HTMLTextAreaElement;
    event.currentTarget.reset();
    textarea.style.height = "auto";
  };

  return (
    <form className={styles.composer} onSubmit={submit}>
      <label className={styles.srOnly} htmlFor="chat-message">
        {inputLabel}
      </label>
      <textarea
        id="chat-message"
        name="message"
        rows={1}
        maxLength={500}
        autoComplete="off"
        placeholder={placeholder}
        onInput={(event) => {
          const textarea = event.currentTarget;
          textarea.style.height = "auto";
          textarea.style.height = `${Math.min(textarea.scrollHeight, 72)}px`;
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
          event.preventDefault();
          event.currentTarget.form?.requestSubmit();
        }}
      />
      <button type="submit" aria-label={sendLabel} disabled={isReplying}>
        <Icon name="send" size={17} />
      </button>
    </form>
  );
});

ChatComposer.displayName = "ChatComposer";

export { ChatComposer };
