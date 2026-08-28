// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { UploadProgress } from "@/features/image-upload/_components/UploadProgress";

describe("UploadProgress", () => {
  afterEach(cleanup);

  it("멈춰 있을 때는 아무것도 그리지 않는다", () => {
    const { container } = render(<UploadProgress stage="idle" />);

    expect(container.firstChild).toBeNull();
  });

  it("단계마다 다른 문구를 낭독 영역에 둔다", () => {
    render(<UploadProgress stage="compressing" />);

    expect(screen.getByRole("status").textContent).toBe("압축 중…");
  });

  it("한 장이면 개수를 붙이지 않는다", () => {
    render(<UploadProgress stage="uploading" completed={0} total={1} />);

    expect(screen.getByRole("status").textContent).toBe("업로드 중…");
  });

  it("여러 장이면 진행 개수를 함께 알린다", () => {
    render(<UploadProgress stage="uploading" completed={2} total={5} />);

    expect(screen.getByRole("status").textContent).toBe("업로드 중… 2/5");
  });

  it("진행 막대는 완료 비율만큼 채운다", () => {
    const { container } = render(<UploadProgress stage="uploading" completed={1} total={4} />);
    const bar = container.querySelector("span > span") as HTMLElement;

    expect(bar.style.width).toBe("25%");
  });

  it("완료 수가 총량을 넘어도 100% 를 넘지 않는다", () => {
    const { container } = render(<UploadProgress stage="uploading" completed={9} total={4} />);
    const bar = container.querySelector("span > span") as HTMLElement;

    expect(bar.style.width).toBe("100%");
  });
});
