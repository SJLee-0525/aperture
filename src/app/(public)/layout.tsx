import { IntroSplash } from "@/components/IntroSplash";
import { PublicImageProtection } from "@/components/PublicImageProtection";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileTabBar } from "@/features/site-header/_components/MobileTabBar";
import { SectionAccent } from "@/features/site-header/_components/SectionAccent";
import { SiteHeader } from "@/features/site-header/_components/SiteHeader";

import styles from "./layout.module.css";

/** 공개(방문자) 레이아웃 — chrome(헤더 + 모바일 탭바) 마운트는 여기서만. */
const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <PublicImageProtection />
      <SectionAccent />
      <IntroSplash />
      <SiteHeader />
      <div className={styles.content}>{children}</div>
      <SiteFooter />
      <MobileTabBar />
    </>
  );
};

export default PublicLayout;
