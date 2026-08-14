// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminButton } from "@/components/AdminButton";

describe("AdminButton", () => {
  afterEach(cleanup);

  it("href가 없으면 기본 type이 button인 버튼으로 렌더링한다", () => {
    render(<AdminButton variant="primary">저장</AdminButton>);

    const button = screen.getByRole("button", { name: "저장" });
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
  });

  it("type=submit을 전달하면 제출 버튼이 된다", () => {
    render(
      <AdminButton variant="primary" type="submit">
        저장
      </AdminButton>,
    );

    expect(screen.getByRole("button", { name: "저장" }).getAttribute("type")).toBe("submit");
  });

  it("disabled를 네이티브 버튼에 전달한다", () => {
    render(
      <AdminButton variant="primary" disabled>
        저장
      </AdminButton>,
    );

    expect((screen.getByRole("button", { name: "저장" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("href가 있으면 같은 클래스를 가진 링크로 렌더링한다", () => {
    render(
      <AdminButton variant="primary" size="sm" href="/admin/photos/new">
        + 새 사진
      </AdminButton>,
    );

    const link = screen.getByRole("link", { name: "+ 새 사진" });
    expect(link.getAttribute("href")).toBe("/admin/photos/new");
    expect(link.className).toContain("button");
  });

  it("링크에 disabled를 주면 이동을 막고 보조기술에 비활성으로 알린다", () => {
    const onClick = vi.fn();
    render(
      <AdminButton variant="secondary" href="/admin" disabled onClick={onClick}>
        취소
      </AdminButton>,
    );

    const link = screen.getByRole("link", { name: "취소" });
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.getAttribute("tabindex")).toBe("-1");
    // <a disabled> 는 무효 속성이라 DOM 으로 내보내지 않는다.
    expect(link.hasAttribute("disabled")).toBe(false);

    const clicked = fireEvent.click(link);
    expect(clicked).toBe(false);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("비활성이 아닌 링크는 호출부 onClick을 그대로 부른다", () => {
    const onClick = vi.fn();
    render(
      <AdminButton variant="secondary" href="/admin" onClick={onClick}>
        취소
      </AdminButton>,
    );

    fireEvent.click(screen.getByRole("link", { name: "취소" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "취소" }).getAttribute("aria-disabled")).toBeNull();
  });

  it("호출부 className을 공용 클래스에 병합한다", () => {
    render(
      <AdminButton variant="secondary" className="custom">
        취소
      </AdminButton>,
    );

    const button = screen.getByRole("button", { name: "취소" });
    expect(button.className).toContain("custom");
    expect(button.className).toContain("secondary");
  });
});
