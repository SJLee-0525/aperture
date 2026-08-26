"use client";

import { type FormEvent, memo } from "react";

import { CloseIcon } from "@/components/CloseIcon";
import { Icon } from "@/components/Icon";

import styles from "./ChatPanel.module.css";

/** 입력창 안에 표시하는 화면 문맥 토큰 — label은 표시 전용, notice는 스크린리더·툴팁용. */
type ContextToken = {
  label: string;
  notice: string;
  dismissLabel: string;
  onDismiss: () => void;
};

type Props = {
  inputLabel: string;
  placeholder: string;
  sendLabel: string;
  isReplying: boolean;
  onSend: (message: string) => boolean;
  contextToken?: ContextToken | null;
};

/** 타이핑 값을 DOM에 유지해 입력마다 패널과 전송 버튼을 다시 렌더하지 않는다. */
const ChatComposer = memo(
  ({ inputLabel, placeholder, sendLabel, isReplying, onSend, contextToken }: Props) => {
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
        <label className="sr-only" htmlFor="chat-message">
          {inputLabel}
        </label>
        {contextToken ? (
          // 열린 상세 항목이 이 질문의 문맥임을 입력창 위 행에서 알린다 — 별도 안내 박스
          // 대신 입력창 내부 첨부 토큰 패턴. 종류 접두어("보고 있는 사진") + 제목 + 제외.
          <span className={styles.contextToken}>
            <span className={styles.contextTokenNotice}>{contextToken.notice}</span>
            <span className={styles.contextTokenLabel}>{contextToken.label}</span>
            <button
              type="button"
              className={styles.contextTokenDismiss}
              aria-label={contextToken.dismissLabel}
              title={contextToken.dismissLabel}
              onClick={contextToken.onDismiss}
            >
              <CloseIcon />
            </button>
          </span>
        ) : null}
        <div className={styles.composerRow}>
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
        </div>
      </form>
    );
  },
);

ChatComposer.displayName = "ChatComposer";

export { ChatComposer };
