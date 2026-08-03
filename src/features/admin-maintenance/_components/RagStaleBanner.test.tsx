// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RagStaleBanner } from "@/features/admin-maintenance/_components/RagStaleBanner";
import { generatePortfolioEmbeddings } from "@/features/admin-maintenance/_lib/generate-portfolio-embeddings";
import { getPortfolioEmbeddingStatus } from "@/features/admin-maintenance/_lib/get-portfolio-embedding-status";

vi.mock("@/features/admin-maintenance/_lib/get-portfolio-embedding-status", () => ({
  getPortfolioEmbeddingStatus: vi.fn(),
}));

vi.mock("@/features/admin-maintenance/_lib/generate-portfolio-embeddings", () => ({
  generatePortfolioEmbeddings: vi.fn(),
}));

const statusMock = vi.mocked(getPortfolioEmbeddingStatus);
const generateMock = vi.mocked(generatePortfolioEmbeddings);

const statusWith = (stale: number) => ({
  completed: 10,
  model: "text-embedding-3-small@512",
  outdated: 0,
  pending: 0,
  percent: 100,
  stale,
  total: 10,
});

describe("RagStaleBanner", () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it("stale 청크가 없으면 아무것도 렌더하지 않는다", async () => {
    statusMock.mockResolvedValue(statusWith(0));

    render(<RagStaleBanner />);

    await waitFor(() => expect(statusMock).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("상태 조회가 실패해도 배너 없이 조용히 넘어간다", async () => {
    statusMock.mockRejectedValue(new Error("네트워크 오류"));

    render(<RagStaleBanner />);

    await waitFor(() => expect(statusMock).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("stale 청크가 있으면 경고 배너를 띄우고, 동기화 성공 시 배너를 내린다", async () => {
    statusMock.mockResolvedValueOnce(statusWith(3)).mockResolvedValueOnce(statusWith(0));
    generateMock.mockResolvedValue({
      count: 10,
      dimensions: 512,
      model: "text-embedding-3-small@512",
      sections: {},
    });

    render(<RagStaleBanner />);

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("3개")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "지금 동기화" }));

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(generateMock).toHaveBeenCalledOnce();
    expect(statusMock).toHaveBeenCalledTimes(2);
  });

  it("동기화 실패 시 배너를 유지하고 오류를 보여준다", async () => {
    statusMock.mockResolvedValue(statusWith(2));
    generateMock.mockRejectedValue(new Error("임베딩 생성 실패"));

    render(<RagStaleBanner />);

    fireEvent.click(await screen.findByRole("button", { name: "지금 동기화" }));

    expect(await screen.findByText(/임베딩 생성 실패/)).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("나중에 버튼으로 이번 화면에서는 배너를 닫을 수 있다", async () => {
    statusMock.mockResolvedValue(statusWith(1));

    render(<RagStaleBanner />);

    fireEvent.click(await screen.findByRole("button", { name: "나중에" }));

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
