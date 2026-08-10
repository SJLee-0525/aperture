// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminMonitoring } from "./AdminMonitoring";

const { startBrowserMonitoring, stopBrowserMonitoring } = vi.hoisted(() => ({
  startBrowserMonitoring: vi.fn(() => Promise.resolve()),
  stopBrowserMonitoring: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/monitoring/browser-monitoring", () => ({
  startBrowserMonitoring,
  stopBrowserMonitoring,
}));

describe("AdminMonitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in admin mode and stops when the authenticated tree unmounts", () => {
    const view = render(<AdminMonitoring />);

    expect(startBrowserMonitoring).toHaveBeenCalledWith("admin");
    view.unmount();
    expect(stopBrowserMonitoring).toHaveBeenCalledOnce();
  });
});
