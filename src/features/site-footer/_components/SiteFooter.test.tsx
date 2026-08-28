// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SiteFooter } from "@/features/site-footer/_components/SiteFooter";

import { DICTIONARY } from "@/constants/dictionary";
import { MEGA_MENU } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";

const mockPathname = { value: "/ko" };

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.value,
}));

const TAGLINE = { ko: "사진가 · 피아니스트 · 개발자", en: "Photographer · Pianist · Developer" };

const renderFooter = (lang: "ko" | "en") =>
  render(<SiteFooter lang={lang} tagline={TAGLINE} links={[]} />);

/** 링크 텍스트로 href 를 읽는다 — 서버 컴포넌트가 로케일을 직접 붙이는지 확인하는 것이 목적이다. */
const hrefOf = (label: string) => screen.getByRole("link", { name: label }).getAttribute("href");

describe("SiteFooter", () => {
  beforeEach(() => {
    mockPathname.value = "/ko";
  });
  afterEach(cleanup);

  it("ko 에서 내부 링크에 /ko 프리픽스를 붙인다", () => {
    renderFooter("ko");

    expect(hrefOf(DICTIONARY.ko.privacyNav)).toBe(`/ko${ROUTES.PRIVACY}`);
    expect(hrefOf(DICTIONARY.ko.termsNav)).toBe(`/ko${ROUTES.TERMS}`);
    expect(hrefOf(DICTIONARY.ko.accessibilityNav)).toBe(`/ko${ROUTES.ACCESSIBILITY}`);
  });

  it("en 에서 같은 링크에 /en 프리픽스를 붙인다", () => {
    renderFooter("en");

    expect(hrefOf(DICTIONARY.en.privacyNav)).toBe(`/en${ROUTES.PRIVACY}`);
    expect(hrefOf(DICTIONARY.en.termsNav)).toBe(`/en${ROUTES.TERMS}`);
    expect(hrefOf(DICTIONARY.en.accessibilityNav)).toBe(`/en${ROUTES.ACCESSIBILITY}`);
  });

  it("사이트맵 섹션 링크도 현재 언어를 따른다", () => {
    renderFooter("en");

    for (const section of MEGA_MENU) {
      // UIDict 에는 문자열 배열 값도 있어 인덱스 결과가 바로 좁혀지지 않는다.
      const label = DICTIONARY.en[section.labelKey];
      if (typeof label !== "string") throw new Error(`nav label must be a string: ${section.href}`);
      expect(hrefOf(label)).toBe(`/en${section.href}`);
    }
  });

  it("현재 지면의 사이트맵 링크에만 aria-current 를 붙인다", () => {
    const target = MEGA_MENU[0];
    const label = DICTIONARY.ko[target.labelKey];
    if (typeof label !== "string") throw new Error(`nav label must be a string: ${target.href}`);
    mockPathname.value = `/ko${target.href}`;

    renderFooter("ko");

    // 개발 섹션은 컬럼 제목과 첫 하위 링크가 같은 href 라 둘 다 현재로 표시된다.
    // 지면이 하나라는 사실은 그대로이므로 표시 자체는 맞다.
    const marked = screen.getAllByRole("link").filter((el) => el.hasAttribute("aria-current"));
    expect(marked.length).toBeGreaterThan(0);
    for (const link of marked) {
      expect(link.getAttribute("href")).toBe(mockPathname.value);
      expect(link.getAttribute("aria-current")).toBe("page");
    }
    expect(marked.some((el) => el.textContent === label)).toBe(true);
    expect(
      screen.getByRole("link", { name: DICTIONARY.ko.privacyNav }).hasAttribute("aria-current"),
    ).toBe(false);
  });

  it("태그라인은 현재 언어로 고른다", () => {
    renderFooter("en");

    expect(screen.getByText(TAGLINE.en)).toBeTruthy();
  });
});
