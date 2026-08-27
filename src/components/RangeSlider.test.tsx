// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RangeSlider } from "@/components/RangeSlider";

type Callbacks = {
  onChangeEnd: ReturnType<typeof vi.fn<(low: number, high: number) => void>>;
  onChangeCancel: ReturnType<typeof vi.fn<() => void>>;
};

// 실제 사용처(usePhotoFilter draft)처럼 onChange를 상태로 반영하는 하네스 —
// controlled input이라 부모가 값을 되돌려줘야 드래그 틱이 유지된다.
const Harness = ({ onChangeEnd, onChangeCancel }: Callbacks) => {
  const [range, setRange] = useState({ low: 16, high: 300 });
  return (
    <RangeSlider
      min={16}
      max={300}
      low={range.low}
      high={range.high}
      unit="mm"
      minLabel="초점거리 최솟값"
      maxLabel="초점거리 최댓값"
      onChange={(low, high) => setRange({ low, high })}
      onChangeEnd={onChangeEnd}
      onChangeCancel={onChangeCancel}
    />
  );
};

const renderSlider = () => {
  const callbacks: Callbacks = {
    onChangeEnd: vi.fn<(low: number, high: number) => void>(),
    onChangeCancel: vi.fn<() => void>(),
  };
  render(<Harness {...callbacks} />);
  const [lowInput, highInput] = screen.getAllByRole("slider");
  return { ...callbacks, lowInput: lowInput!, highInput: highInput! };
};

describe("RangeSlider", () => {
  afterEach(cleanup);

  it("드래그 → pointerup → blur는 한 번만 커밋한다", () => {
    const { onChangeEnd, lowInput } = renderSlider();

    fireEvent.change(lowInput, { target: { value: "35" } });
    fireEvent.pointerUp(lowInput);
    fireEvent.blur(lowInput);

    expect(onChangeEnd).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).toHaveBeenCalledWith(35, 300);
  });

  it("드래그 → pointercancel → blur는 취소만 호출하고 커밋하지 않는다", () => {
    const { onChangeEnd, onChangeCancel, lowInput } = renderSlider();

    fireEvent.change(lowInput, { target: { value: "35" } });
    fireEvent.pointerCancel(lowInput);
    fireEvent.blur(lowInput);

    expect(onChangeCancel).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).not.toHaveBeenCalled();
  });

  it("키보드 변경 → keyup → blur도 같은 값 중복 커밋을 막는다", () => {
    const { onChangeEnd, highInput } = renderSlider();

    fireEvent.change(highInput, { target: { value: "200" } });
    fireEvent.keyUp(highInput, { key: "ArrowLeft" });
    fireEvent.blur(highInput);

    expect(onChangeEnd).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).toHaveBeenCalledWith(16, 200);
  });

  it("조작 없이 발생한 blur·pointerup은 커밋하지 않는다", () => {
    const { onChangeEnd, onChangeCancel, lowInput } = renderSlider();

    fireEvent.pointerUp(lowInput);
    fireEvent.blur(lowInput);
    fireEvent.pointerCancel(lowInput);

    expect(onChangeEnd).not.toHaveBeenCalled();
    expect(onChangeCancel).not.toHaveBeenCalled();
  });

  it("두 핸들이 교차하지 않게 경계에서 클램프해 커밋한다", () => {
    const { onChangeEnd, lowInput, highInput } = renderSlider();

    // high를 100으로 낮춘 뒤 low를 그 위로 끌어도 low는 high에 붙는다.
    fireEvent.change(highInput, { target: { value: "100" } });
    fireEvent.pointerUp(highInput);
    fireEvent.change(lowInput, { target: { value: "250" } });
    fireEvent.pointerUp(lowInput);

    expect(onChangeEnd).toHaveBeenNthCalledWith(1, 16, 100);
    expect(onChangeEnd).toHaveBeenNthCalledWith(2, 100, 100);
  });

  it("취소 후 새로 조작하면 다시 커밋할 수 있다", () => {
    const { onChangeEnd, onChangeCancel, lowInput } = renderSlider();

    fireEvent.change(lowInput, { target: { value: "35" } });
    fireEvent.pointerCancel(lowInput);
    fireEvent.change(lowInput, { target: { value: "50" } });
    fireEvent.pointerUp(lowInput);

    expect(onChangeCancel).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).toHaveBeenCalledWith(50, 300);
  });

  it("각 손잡이가 무엇의 최소·최대인지 이름과 값으로 알린다", () => {
    render(<Harness onChangeEnd={vi.fn()} onChangeCancel={vi.fn()} />);

    const [lowInput, highInput] = screen.getAllByRole("slider");
    expect(lowInput.getAttribute("aria-label")).toBe("초점거리 최솟값");
    expect(highInput.getAttribute("aria-label")).toBe("초점거리 최댓값");
    // 단위가 없으면 "24" 로만 읽혀 무엇의 값인지 알 수 없다.
    expect(lowInput.getAttribute("aria-valuetext")).toBe("16mm");
    expect(highInput.getAttribute("aria-valuetext")).toBe("300mm");
  });
});
