"use client";

import { useEffect, useState } from "react";

import { DICTIONARY } from "@/constants/dictionary";

import type { Lang } from "@/types/lang";

const MESSAGE_INTERVAL_MS = 2_500;

/**
 * 포트폴리오 검색 대기 상태 문구 롤링 — 문구는 DICTIONARY.chatSearchStatuses 단일 출처.
 *
 * @param {{ lang: Lang }} props
 * @param {Lang} props.lang
 * @returns {JSX.Element}
 */
const PortfolioSearchStatus = ({ lang }: { lang: Lang }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = DICTIONARY[lang].chatSearchStatuses;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, MESSAGE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [messages]);

  return <span>{messages[messageIndex]}</span>;
};

export { MESSAGE_INTERVAL_MS, PortfolioSearchStatus };
