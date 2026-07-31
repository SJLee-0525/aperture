import { ContactView } from "@/features/contact/_components/ContactView";
import { getSite } from "@/lib/content/get-site";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "문의",
  description: "사진, 음악, 개발 작업과 협업에 관해 이성준에게 문의하세요.",
  pathname: "/contact",
});

export const revalidate = 3600;

/** 연락처 — mailto 폼 + 직접 연락(사이트 링크). site/config 에서 링크·메일 주소 수급. */
export default async function ContactPage() {
  const site = await getSite();
  return <ContactView site={site} />;
}
