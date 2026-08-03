// @vitest-environment jsdom

import { render } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";

import { DICTIONARY } from "@/constants/dictionary";
import { LandingNav } from "@/features/landing/_components/LandingView";

const linkRender = vi.fn();

vi.mock("next/link", () => ({
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => {
    linkRender();
    return <a href={href} {...props} />;
  },
}));

describe("LandingNav", () => {
  it("동일한 props에서는 하단 섹션 링크를 다시 렌더하지 않는다", () => {
    const onRowEnter = vi.fn();
    const onRowLeave = vi.fn();
    const { rerender } = render(
      <LandingNav dict={DICTIONARY.ko} onRowEnter={onRowEnter} onRowLeave={onRowLeave} started />,
    );

    expect(linkRender).toHaveBeenCalledTimes(3);

    rerender(
      <LandingNav dict={DICTIONARY.ko} onRowEnter={onRowEnter} onRowLeave={onRowLeave} started />,
    );

    expect(linkRender).toHaveBeenCalledTimes(3);
  });
});
