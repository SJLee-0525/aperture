import { ChatScreenTargetProvider } from "@/components/ChatScreenTargetProvider";
import { IntroSplash } from "@/components/IntroSplash";
import { PublicImageProtection } from "@/components/PublicImageProtection";
import { AnalyticsConsentProvider } from "@/features/analytics/_components/AnalyticsConsentProvider";
import { AnalyticsSettingsButton } from "@/features/analytics/_components/AnalyticsSettingsButton";
import { ChatLauncher } from "@/features/chat/_components/ChatLauncher";
import { SiteFooter } from "@/features/site-footer/_components/SiteFooter";
import { MobileNavigationVisibility } from "@/features/site-header/_components/MobileNavigationVisibility";
import { MobileTabBar } from "@/features/site-header/_components/MobileTabBar";
import { SectionAccent } from "@/features/site-header/_components/SectionAccent";
import { SiteHeader } from "@/features/site-header/_components/SiteHeader";
import { WebMcpTools } from "@/features/webmcp/_components/WebMcpTools";

import { GA_MEASUREMENT_ID } from "@/features/analytics/_lib/ga-measurement-id";

import { DICTIONARY } from "@/constants/dictionary";
import { toLang } from "@/constants/langs";
import { getSite } from "@/lib/content/site";
import { SENTRY_DSN } from "@/lib/monitoring/monitoring-dsn";

import styles from "./layout.module.css";

// Next.js 정적 분석을 위해 리터럴 유지 — 모든 공개 페이지의 기본 ISR 주기(1시간).
export const revalidate = 3600;

// Next.js 가 생성하는 LayoutProps 는 세그먼트를 string 으로 준다. Lang 으로 좁히는 것은 아래 isLang 검사다.
type Props = { children: React.ReactNode; params: Promise<{ lang: string }> };

/**
 * 공개(방문자) 레이아웃 — chrome(헤더 + 모바일 탭바) 마운트는 여기서만. 푸터 연락 링크·태그라인은 site/config.
 *
 * 헤더·푸터는 서버 컴포넌트라 언어를 컨텍스트가 아니라 `[lang]` 세그먼트에서 받는다.
 *
 * @param {Props} props
 * @param {ReactNode} props.children
 * @param {Promise<{ lang: string }>} props.params
 * @returns {Promise<JSX.Element>}
 */
const PublicLayout = async ({ children, params }: Props) => {
  const [{ lang: segment }, site] = await Promise.all([params, getSite()]);
  const lang = toLang(segment);
  const forceConsentBanner =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_FORCE_ANALYTICS_CONSENT_BANNER === "1";
  return (
    <AnalyticsConsentProvider
      gaEnabled={Boolean(GA_MEASUREMENT_ID)}
      monitoringEnabled={Boolean(SENTRY_DSN)}
      forceBanner={forceConsentBanner}
    >
      {/* 셸의 어떤 컨트롤보다 먼저 오는 포커스 대상이어야 한다. 데스크톱 탭 경로가
          워드마크·mega-menu 세 그룹·연락·언어·테마·검색으로 길어 본문이 뒤에 있다. */}
      <a href="#page-content" className="sr-only u-skip-link">
        {DICTIONARY[lang].skipToContent}
      </a>
      <PublicImageProtection />
      <MobileNavigationVisibility />
      <SectionAccent />
      <IntroSplash />
      <SiteHeader lang={lang} />
      {/* 상세 모달의 제목을 챗봇 입력창에 표시한다. */}
      <ChatScreenTargetProvider>
        <div id="page-content" className={styles.content}>
          {children}
        </div>
        <SiteFooter
          lang={lang}
          tagline={site.tagline}
          links={site.links}
          privacyControls={<AnalyticsSettingsButton />}
        />
        <MobileTabBar />
        <ChatLauncher />
      </ChatScreenTargetProvider>
      {/* WebMCP 전역 도구 — 지원 브라우저에서만 dynamic 로드. 프로필 최소 투영만 전달. */}
      <WebMcpTools profile={{ name: site.name, tagline: site.tagline, bio: site.bio }} />
    </AnalyticsConsentProvider>
  );
};

export default PublicLayout;
