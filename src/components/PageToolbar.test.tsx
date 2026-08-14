// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PageToolbar } from "@/components/PageToolbar";

describe("PageToolbar", () => {
  afterEach(cleanup);

  it("제목을 지면의 h1 으로 표시한다", () => {
    render(<PageToolbar title="작업" />);

    expect(screen.getByRole("heading", { level: 1, name: "작업" })).toBeTruthy();
  });

  it("결과 수 문구를 받은 그대로 표시한다", () => {
    render(<PageToolbar title="작업" count="12 photos" />);

    expect(screen.getByText("12 photos")).toBeTruthy();
  });

  it("도구를 제목 오른쪽에 함께 놓는다", () => {
    render(
      <PageToolbar title="블로그" count="9 articles">
        <button type="button">보기 전환</button>
      </PageToolbar>,
    );

    const tools = screen.getByText("9 articles").parentElement;
    expect(tools?.contains(screen.getByRole("button", { name: "보기 전환" }))).toBe(true);
  });

  it("결과 수와 도구가 모두 없으면 도구 영역을 그리지 않는다", () => {
    const { container } = render(<PageToolbar title="작업" />);

    // 빈 flex 컨테이너가 남으면 제목 아래 간격이 지면마다 달라진다.
    expect(container.querySelector("h1")?.parentElement?.childElementCount).toBe(1);
  });
});
