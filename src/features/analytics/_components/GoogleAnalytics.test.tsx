// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GoogleAnalytics } from "@/features/analytics/_components/GoogleAnalytics";

const { configureGoogleAnalytics } = vi.hoisted(() => ({
  configureGoogleAnalytics: vi.fn(),
}));

vi.mock("@/features/analytics/_lib/ga-measurement-id", () => ({
  GA_MEASUREMENT_ID: "G-TEST",
}));

vi.mock("@/features/analytics/_lib/gtag", () => ({
  configureGoogleAnalytics,
}));

vi.mock("@/features/analytics/_components/PageViewTracker", () => ({
  PageViewTracker: () => <span data-testid="page-view-tracker" />,
}));

vi.mock("next/script", async () => {
  const React = await import("react");
  const MockScript = ({ onReady, src }: { onReady?: () => void; src?: string }) => {
    React.useEffect(() => onReady?.(), [onReady]);
    return <script data-testid="google-script" data-src={src} />;
  };
  return {
    default: MockScript,
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("GoogleAnalytics", () => {
  it("동의 후 bootstrap과 외부 script를 렌더하고 준비 뒤 tracker를 마운트한다", async () => {
    render(<GoogleAnalytics />);
    await waitFor(() => expect(screen.getAllByTestId("google-script")).toHaveLength(2));
    await waitFor(() => expect(configureGoogleAnalytics).toHaveBeenCalledWith("G-TEST"));
    expect(screen.getByTestId("page-view-tracker")).toBeTruthy();
  });

  it("철회로 unmount된 뒤 재허용하면 GA를 다시 구성한다", async () => {
    const first = render(<GoogleAnalytics />);
    await waitFor(() => expect(configureGoogleAnalytics).toHaveBeenCalledTimes(1));

    first.unmount();
    render(<GoogleAnalytics />);
    await waitFor(() => expect(configureGoogleAnalytics).toHaveBeenCalledTimes(2));
  });
});
