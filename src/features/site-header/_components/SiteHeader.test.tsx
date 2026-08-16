// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "@/features/site-header/_components/SiteHeader";

import { DICTIONARY } from "@/constants/dictionary";

// 상호작용하는 자식은 각자 라우터·컨텍스트를 읽는다. 이 테스트의 대상은 서버 셸이므로 자리만 남긴다.
vi.mock("@/features/site-header/_components/DesktopMegaMenu", () => ({
  DesktopMegaMenu: () => <nav data-testid="mega-menu" />,
}));
vi.mock("@/features/site-header/_components/LangMenu", () => ({
  LangMenu: () => <div data-testid="lang-menu" />,
}));
vi.mock("@/features/site-header/_components/MobileMenu", () => ({
  MobileMenu: () => <div data-testid="mobile-menu" />,
}));
vi.mock("@/features/site-header/_components/SearchBox", () => ({
  SearchBox: () => <div data-testid="search-box" />,
}));
vi.mock("@/features/site-header/_components/ThemeToggleButton", () => ({
  ThemeToggleButton: () => <div data-testid="theme-toggle" />,
}));

describe("SiteHeader", () => {
  afterEach(cleanup);

  it("ko 에서 워드마크가 /ko 로 가고 accessible name 이 ko 사전을 쓴다", () => {
    render(<SiteHeader lang="ko" />);

    const brand = screen.getByRole("link", { name: DICTIONARY.ko.homeLabel });
    expect(brand.getAttribute("href")).toBe("/ko");
  });

  it("en 에서 워드마크가 /en 로 가고 accessible name 이 en 사전을 쓴다", () => {
    render(<SiteHeader lang="en" />);

    const brand = screen.getByRole("link", { name: DICTIONARY.en.homeLabel });
    expect(brand.getAttribute("href")).toBe("/en");
  });

  it("상호작용 자식 다섯 개를 모두 배치한다", () => {
    render(<SiteHeader lang="ko" />);

    for (const id of ["mega-menu", "lang-menu", "theme-toggle", "mobile-menu", "search-box"]) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
  });
});
