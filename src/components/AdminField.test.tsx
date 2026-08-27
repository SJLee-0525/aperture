// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";

describe("AdminField", () => {
  afterEach(cleanup);

  it("라벨로 입력을 찾을 수 있다", () => {
    render(
      <AdminField label="카메라">
        <AdminInput />
      </AdminField>,
    );

    expect(screen.getByLabelText("카메라")).toBeTruthy();
  });

  it("required면 라벨 뒤에 별표를 붙인다", () => {
    render(
      <AdminField label="제목 (한국어)" required>
        <AdminInput required />
      </AdminField>,
    );

    expect(screen.getByLabelText("제목 (한국어) *")).toBeTruthy();
  });

  it("호출부 className을 공용 클래스에 병합한다", () => {
    render(
      <AdminField label="주소" className="custom">
        <AdminInput />
      </AdminField>,
    );

    const field = screen.getByText("주소").closest("div");
    expect(field?.className).toContain("custom");
    expect(field?.className).toContain("field");
  });

  it("힌트는 접근 이름이 아니라 aria-describedby 로 붙는다", () => {
    render(
      <AdminField label="주소 (slug)" hint="발행한 글의 주소는 바꿀 수 없습니다.">
        <AdminInput />
      </AdminField>,
    );

    const input = screen.getByLabelText("주소 (slug)");
    const describedBy = input.getAttribute("aria-describedby");

    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe(
      "발행한 글의 주소는 바꿀 수 없습니다.",
    );
  });

  it("오류가 있으면 입력이 aria-invalid 를 받고 문구가 연결된다", () => {
    render(
      <AdminField label="제목" error="제목(한국어)을 입력하세요.">
        <AdminInput />
      </AdminField>,
    );

    const input = screen.getByLabelText("제목");

    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby") as string;
    expect(document.getElementById(describedBy)?.textContent).toBe("제목(한국어)을 입력하세요.");
  });

  it("힌트와 오류가 함께 있으면 둘 다 설명으로 붙는다", () => {
    render(
      <AdminField label="연도" hint="네 자리로 적습니다." error="연도를 입력하세요.">
        <AdminInput />
      </AdminField>,
    );

    const ids = (screen.getByLabelText("연도").getAttribute("aria-describedby") ?? "").split(" ");

    expect(ids).toHaveLength(2);
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual([
      "네 자리로 적습니다.",
      "연도를 입력하세요.",
    ]);
  });

  it("호출부가 준 aria-describedby 가 필드 것을 이긴다", () => {
    render(
      <AdminField label="장소" hint="도시, 국가 코드">
        <AdminInput aria-describedby="external" />
      </AdminField>,
    );

    expect(screen.getByLabelText("장소").getAttribute("aria-describedby")).toBe("external");
  });
});
