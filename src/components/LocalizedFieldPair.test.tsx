// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocalizedFieldPair } from "@/components/LocalizedFieldPair";

describe("LocalizedFieldPair", () => {
  afterEach(cleanup);

  const value = { ko: "한국어 값", en: "english value" };

  it("어간 하나로 ko/en 접근 이름을 만든다", () => {
    render(<LocalizedFieldPair label="제목" value={value} onChange={() => {}} />);

    expect((screen.getByLabelText("제목 (한국어)") as HTMLInputElement).value).toBe("한국어 값");
    expect((screen.getByLabelText("제목 (English)") as HTMLInputElement).value).toBe(
      "english value",
    );
  });

  it("required는 한국어 쪽에만 붙는다", () => {
    render(<LocalizedFieldPair label="제목" value={value} onChange={() => {}} required />);

    expect((screen.getByLabelText("제목 (한국어) *") as HTMLInputElement).required).toBe(true);
    expect((screen.getByLabelText("제목 (English)") as HTMLInputElement).required).toBe(false);
  });

  it("한쪽을 고쳐도 반대쪽 값을 보존해 돌려준다", () => {
    const onChange = vi.fn();
    render(<LocalizedFieldPair label="제목" value={value} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("제목 (English)"), { target: { value: "next" } });

    expect(onChange).toHaveBeenCalledWith({ ko: "한국어 값", en: "next" });
  });

  it("multiline이면 두 쪽 모두 textarea로 그린다", () => {
    render(
      <LocalizedFieldPair label="설명" value={value} onChange={() => {}} multiline rows={4} />,
    );

    expect(screen.getByLabelText("설명 (한국어)").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("설명 (English)").tagName).toBe("TEXTAREA");
  });

  it("placeholder는 언어별로 따로 받는다", () => {
    render(
      <LocalizedFieldPair
        label="출처"
        value={{ ko: "", en: "" }}
        onChange={() => {}}
        placeholder={{ ko: "예술의전당", en: "Seoul Arts Center" }}
      />,
    );

    expect(screen.getByPlaceholderText("예술의전당")).toBeTruthy();
    expect(screen.getByPlaceholderText("Seoul Arts Center")).toBeTruthy();
  });
});
