import { IntroSplash } from "@/components/IntroSplash";
import { PublicImageProtection } from "@/components/PublicImageProtection";
import { ChatLauncher } from "@/features/chat/_components/ChatLauncher";
import { SiteFooter } from "@/features/site-footer/_components/SiteFooter";
import { MobileTabBar } from "@/features/site-header/_components/MobileTabBar";
import { MobileNavigationVisibility } from "@/features/site-header/_components/MobileNavigationVisibility";
import { SectionAccent } from "@/features/site-header/_components/SectionAccent";
import { SiteHeader } from "@/features/site-header/_components/SiteHeader";
import { getSite } from "@/lib/content/site";

import styles from "./layout.module.css";

// Next.js 정적 분석을 위해 리터럴 유지 — 모든 공개 페이지의 기본 ISR 주기(1시간).
export const revalidate = 3600;

/**
 * 공개(방문자) 레이아웃 — chrome(헤더 + 모바일 탭바) 마운트는 여기서만. 푸터 연락 링크·태그라인은 site/config.
 *
 * @param {{ children: React.ReactNode }} props
 * @param {ReactNode} props.children
 * @returns {Promise<JSX.Element>}
 */
const PublicLayout = async ({ children }: { children: React.ReactNode }) => {
  const site = await getSite();
  return (
    <>
      <PublicImageProtection />
      <MobileNavigationVisibility />
      <SectionAccent />
      <IntroSplash />
      <SiteHeader />
      <div id="page-content" className={styles.content}>
        {children}
      </div>
      <SiteFooter tagline={site.tagline} links={site.links} />
      <MobileTabBar />
      <ChatLauncher />
    </>
  );
};

export default PublicLayout;
