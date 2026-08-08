import { BlogIcon } from "@/components/icons/BlogIcon";
import { GitHubIcon } from "@/components/icons/GitHubIcon";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { MailIcon } from "@/components/icons/MailIcon";
import { XIcon } from "@/components/icons/XIcon";
import { YouTubeIcon } from "@/components/icons/YouTubeIcon";

/**
 * 링크 라벨 → 브랜드 글리프 매핑. 아이콘 자체는 components/icons/ 개별 컴포넌트(직접 재사용 가능).
 * site.links 라벨은 관리자가 자유 편집하므로 부분 일치로 매칭, 미지정 라벨은 Email 폴백. 연락 페이지·푸터 공유.
 *
 * @param {{ label: string; size?: number }} props
 * @param {string} props.label
 * @param {number | undefined} props.size
 * @returns {JSX.Element}
 */
const SocialGlyph = ({ label, size = 17 }: { label: string; size?: number }) => {
  const key = label.toLowerCase();
  if (key.includes("github")) return <GitHubIcon size={size} />;
  if (key.includes("linkedin")) return <LinkedInIcon size={size} />;
  if (key === "x" || key.includes("twitter") || key.includes("x.com")) return <XIcon size={size} />;
  if (key.includes("instagram")) return <InstagramIcon size={size} />;
  if (key.includes("youtube")) return <YouTubeIcon size={size} />;
  if (["blog", "velog", "tistory", "rss"].some((name) => key.includes(name))) {
    return <BlogIcon size={size} />;
  }
  return <MailIcon size={size} />;
};

export { SocialGlyph };
