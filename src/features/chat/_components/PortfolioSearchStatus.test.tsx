// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DICTIONARY } from "@/constants/dictionary";

import {
  MESSAGE_INTERVAL_MS,
  PortfolioSearchStatus,
} from "@/features/chat/_components/PortfolioSearchStatus";

afterEach(() => vi.useRealTimers());

describe("PortfolioSearchStatus", () => {
  it("검색이 길어지면 한국어 안내를 순서대로 바꾼다", () => {
    vi.useFakeTimers();
    render(<PortfolioSearchStatus lang="ko" />);

    expect(screen.getByText(DICTIONARY.ko.chatSearchStatuses[0])).toBeTruthy();
    act(() => vi.advanceTimersByTime(MESSAGE_INTERVAL_MS));
    expect(screen.getByText(DICTIONARY.ko.chatSearchStatuses[1])).toBeTruthy();
  });

  it("영어 안내도 제공한다", () => {
    render(<PortfolioSearchStatus lang="en" />);
    expect(screen.getByText(DICTIONARY.en.chatSearchStatuses[0])).toBeTruthy();
  });
});
