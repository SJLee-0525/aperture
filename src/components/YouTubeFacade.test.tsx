// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { YouTubeFacade } from "@/components/YouTubeFacade";

const VIDEO_ID = "kX3nB7dQ2Ls";

describe("YouTubeFacade", () => {
  afterEach(cleanup);

  it("재생 전에는 유튜브가 아니라 썸네일 호스트만 요청한다", () => {
    render(
      <YouTubeFacade
        videoId={VIDEO_ID}
        title="배포 흐름 데모"
        source="직접 녹화"
        playing={false}
        onPlay={vi.fn()}
      />,
    );

    const thumbnail = screen.getByRole("button", { name: "배포 흐름 데모" }).querySelector("img");
    // 테스트에는 next.config 의 `images.unoptimized` 가 적용되지 않아 최적화 경로로 감싸인다.
    expect(decodeURIComponent(thumbnail?.getAttribute("src") ?? "")).toContain(
      `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`,
    );
    expect(document.querySelector("iframe")).toBeNull();
    expect(screen.getByText("직접 녹화")).toBeTruthy();
  });

  it("재생 중에는 영상 ID 로 조립한 embed 만 띄운다", () => {
    render(<YouTubeFacade videoId={VIDEO_ID} title="배포 흐름 데모" playing onPlay={vi.fn()} />);

    const frame = screen.getByTitle("배포 흐름 데모");
    expect(frame.getAttribute("src")).toBe(`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1`);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("눌리면 부모에게 알리고 스스로 재생하지 않는다", () => {
    const onPlay = vi.fn();
    render(
      <YouTubeFacade videoId={VIDEO_ID} title="배포 흐름 데모" playing={false} onPlay={onPlay} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "배포 흐름 데모" }));

    expect(onPlay).toHaveBeenCalledOnce();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("영상 ID 가 없으면 재생 상태여도 자리 그림을 유지한다", () => {
    render(<YouTubeFacade videoId="" title="곧 공개될 연주" playing onPlay={vi.fn()} />);

    expect(document.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("button", { name: "곧 공개될 연주" })).toBeTruthy();
  });

  it("출처가 없으면 그 줄을 그리지 않는다", () => {
    const { container } = render(
      <YouTubeFacade videoId={VIDEO_ID} title="제목" playing={false} onPlay={vi.fn()} />,
    );

    expect(container.textContent).toBe("제목");
  });
});
