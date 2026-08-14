// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminField } from "@/components/AdminField";

describe("AdminField", () => {
  afterEach(cleanup);

  it("라벨로 입력을 찾을 수 있다", () => {
    render(
      <AdminField label="카메라">
        <input />
      </AdminField>,
    );

    expect(screen.getByLabelText("카메라")).toBeTruthy();
  });

  it("required면 라벨 뒤에 별표를 붙인다", () => {
    render(
      <AdminField label="제목 (한국어)" required>
        <input required />
      </AdminField>,
    );

    expect(screen.getByLabelText("제목 (한국어) *")).toBeTruthy();
  });

  it("호출부 className을 공용 클래스에 병합한다", () => {
    render(
      <AdminField label="주소" className="custom">
        <input />
      </AdminField>,
    );

    const field = screen.getByText("주소").closest("label");
    expect(field?.className).toContain("custom");
    expect(field?.className).toContain("field");
  });
});
