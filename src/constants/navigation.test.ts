import { describe, expect, it } from "vitest";

import { DICTIONARY } from "@/constants/dictionary";
import { CONTACT_NAV, MEGA_MENU, MOBILE_TABS } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";

/** 데스크톱 mega-menu·모바일 버거 시트·푸터 사이트맵이 모두 이 상수를 읽으므로 순서가 곧 정보 구조다. */
const devGroup = MEGA_MENU.find((group) => group.section === "dev");

describe("MEGA_MENU", () => {
  it("개발 그룹은 소개 → 경력·기술 → 프로젝트 순서다", () => {
    expect(devGroup?.href).toBe(ROUTES.DEV);
    expect(devGroup?.links).toEqual([
      { labelKey: "aboutNav", href: ROUTES.DEV },
      { labelKey: "devCareerStackNav", href: ROUTES.DEV_CAREER },
      { labelKey: "devProjectsNav", href: ROUTES.DEV_PROJECTS },
    ]);
  });

  it("링크 라벨 키가 ko·en 사전에 모두 있다", () => {
    const labelKeys = [
      ...MEGA_MENU.flatMap((group) => [
        group.labelKey,
        ...group.links.map((link) => link.labelKey),
      ]),
      CONTACT_NAV.labelKey,
      ...Object.values(MOBILE_TABS).flatMap((tabs) => tabs.map((tab) => tab.labelKey)),
    ];

    for (const key of labelKeys) {
      expect(DICTIONARY.ko[key], `ko.${key}`).toBeTruthy();
      expect(DICTIONARY.en[key], `en.${key}`).toBeTruthy();
    }
  });

  it("리다이렉트되는 경로를 링크로 노출하지 않는다", () => {
    const hrefs = MEGA_MENU.flatMap((group) => [group.href, ...group.links.map((l) => l.href)]);
    expect(hrefs).not.toContain("/dev/about");
  });
});

describe("MOBILE_TABS", () => {
  it("개발 탭이 mega-menu 와 같은 경로·순서를 쓴다", () => {
    expect(MOBILE_TABS.dev.map((tab) => tab.href)).toEqual(
      devGroup?.links.map((link) => link.href),
    );
  });

  it("모든 섹션 탭이 자기 섹션 경로만 가리킨다", () => {
    for (const [section, tabs] of Object.entries(MOBILE_TABS)) {
      for (const tab of tabs) {
        expect(tab.href.startsWith(`/${section}`), `${section}: ${tab.href}`).toBe(true);
      }
    }
  });
});
