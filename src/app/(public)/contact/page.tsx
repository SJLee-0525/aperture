import { ContactView } from "@/features/contact/_components/ContactView";
import { getSite } from "@/lib/content/site";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Contact",
  description: "이성준에게 사진, 음악, 개발 작업과 협업 문의를 보낼 수 있습니다.",
  pathname: "/contact",
});

export const revalidate = 3600;

/** 연락처 — mailto 폼 + 직접 연락(사이트 링크). site/config 에서 링크·메일 주소 수급. */
export default async function ContactPage() {
  const site = await getSite();
  return <ContactView site={site} />;
}
