// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminInput } from "@/components/AdminInput";

describe("AdminInput", () => {
  afterEach(cleanup);

  it("기본으로 input을 렌더링하고 네이티브 속성을 전달한다", () => {
    render(<AdminInput aria-label="제목" type="email" required autoComplete="username" />);

    const input = screen.getByLabelText("제목") as HTMLInputElement;
    expect(input.tagName).toBe("INPUT");
    expect(input.type).toBe("email");
    expect(input.required).toBe(true);
    expect(input.autocomplete).toBe("username");
  });

  it("multiline이면 textarea를 렌더링하고 rows를 전달한다", () => {
    render(<AdminInput multiline aria-label="본문" rows={6} />);

    const textarea = screen.getByLabelText("본문") as HTMLTextAreaElement;
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea.rows).toBe(6);
  });

  it("호출부 className을 공용 클래스에 병합한다", () => {
    render(<AdminInput aria-label="검색" className="custom" size="sm" />);

    const input = screen.getByLabelText("검색");
    expect(input.className).toContain("custom");
    expect(input.className).toContain("control");
  });
});
