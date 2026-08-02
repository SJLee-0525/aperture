"use client";

import { useEffect, useState } from "react";

import type { Lang } from "@/types/lang";

const SEARCH_MESSAGES = {
  ko: [
    "포트폴리오를 펼쳐보는 중…",
    "관련 작업을 찾는 중…",
    "기록 사이를 탐색하는 중…",
    "질문과 가까운 작업을 고르는 중…",
    "답변에 담을 내용을 정리하는 중…",
  ],
  en: [
    "Opening up the portfolio…",
    "Looking for relevant work…",
    "Exploring the archive…",
    "Picking work that matches your question…",
    "Gathering details for the answer…",
  ],
} as const;

const MESSAGE_INTERVAL_MS = 1_800;

const PortfolioSearchStatus = ({ lang }: { lang: Lang }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = SEARCH_MESSAGES[lang];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, MESSAGE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [messages]);

  return <span>{messages[messageIndex]}</span>;
};

export { MESSAGE_INTERVAL_MS, PortfolioSearchStatus, SEARCH_MESSAGES };
