// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OnDemandDevProjectDetail } from "@/features/dev/_components/OnDemandDevProjectDetail";

import { toDevProjectCard } from "@/features/dev/_lib/dev-project-card";

import { MOCK_DEV_PROJECTS } from "@/mocks/dev";

import type { DevProject } from "@/types/dev";

vi.mock("next/dynamic", () => ({
  default: () =>
    function DetailStub({ project }: { project: DevProject }) {
      return <div>상세 콘텐츠 {project.id}</div>;
    },
}));
vi.mock("@/features/dev/_components/DevProjectDetail", () => ({
  DevProjectDetailContent: ({ project }: { project: DevProject }) => (
    <div>상세 콘텐츠 {project.id}</div>
  ),
}));

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({
    lang: "ko",
    dict: {
      closeLabel: "닫기",
      devProjectLoadError: "불러오지 못했습니다",
      devProjectLoadingLabel: "프로젝트 불러오는 중",
      errorRetry: "다시 시도",
    },
  }),
}));

describe("OnDemandDevProjectDetail", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("상세 응답 전후에 같은 모달 패널을 유지한다", async () => {
    const project = MOCK_DEV_PROJECTS[0];
    let resolveResponse!: (response: { ok: boolean; json: () => Promise<DevProject> }) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<{ ok: boolean; json: () => Promise<DevProject> }>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <OnDemandDevProjectDetail
        project={toDevProjectCard(project)}
        open
        onClose={vi.fn()}
        endpoint="/api/dev-projects"
      />,
    );

    const loadingDialog = screen.getByRole("dialog");
    expect(screen.getByLabelText("프로젝트 불러오는 중")).toBeTruthy();

    await act(async () => {
      resolveResponse({ ok: true, json: async () => project });
    });

    await screen.findByText(`상세 콘텐츠 ${project.id}`);
    expect(screen.getByRole("dialog")).toBe(loadingDialog);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
