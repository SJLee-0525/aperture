// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MESSAGE_INTERVAL_MS,
  PortfolioSearchStatus,
  SEARCH_MESSAGES,
} from "@/features/chat/_components/PortfolioSearchStatus";

afterEach(() => vi.useRealTimers());

describe("PortfolioSearchStatus", () => {
  it("검색이 길어지면 한국어 안내를 순서대로 바꾼다", () => {
    vi.useFakeTimers();
    render(<PortfolioSearchStatus lang="ko" />);

    expect(screen.getByText(SEARCH_MESSAGES.ko[0])).toBeTruthy();
    act(() => vi.advanceTimersByTime(MESSAGE_INTERVAL_MS));
    expect(screen.getByText(SEARCH_MESSAGES.ko[1])).toBeTruthy();
  });

  it("영어 안내도 제공한다", () => {
    render(<PortfolioSearchStatus lang="en" />);
    expect(screen.getByText(SEARCH_MESSAGES.en[0])).toBeTruthy();
  });
});
