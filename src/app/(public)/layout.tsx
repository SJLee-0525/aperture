import { IntroSplash } from "@/components/IntroSplash";
import { MobileTabBar } from "@/features/site-header/MobileTabBar";
import { SiteHeader } from "@/features/site-header/SiteHeader";

import styles from "./layout.module.css";

/** 공개(방문자) 레이아웃 — chrome(헤더 + 모바일 탭바) 마운트는 여기서만. */
const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <IntroSplash />
      <SiteHeader />
      <div className={styles.content}>{children}</div>
      <MobileTabBar />
    </>
  );
};

export default PublicLayout;
