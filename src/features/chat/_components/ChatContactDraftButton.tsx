"use client";

import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { ROUTES } from "@/constants/routes";
import { writeContactDraft } from "@/lib/contact-draft-storage";

import type { ContactDraft } from "@/types/chat";

type Props = {
  draft: ContactDraft;
  label: string;
  className?: string;
  onNavigate?: () => void;
};

/**
 * 클릭할 때 연락 초안을 sessionStorage에 저장하고 현재 탭에서 연락 페이지로 이동한다.
 * 저장하지 못해도 링크 이동은 계속한다. 버튼 문구에는 사전에서 받은 label만 사용한다.
 *
 * @param {Props} props 컴포넌트 속성.
 * @param {ContactDraft} props.draft 저장할 연락 초안.
 * @param {string} props.label 사전에서 읽은 버튼 문구.
 * @param {string | undefined} props.className 링크에 적용할 CSS class.
 * @param {(() => void) | undefined} props.onNavigate 이동 전에 실행할 콜백.
 * @returns {JSX.Element} 연락 페이지로 이동하는 로케일 링크.
 */
const ChatContactDraftButton = ({ draft, label, className, onNavigate }: Props) => (
  <LocalizedLink
    className={className}
    href={ROUTES.CONTACT}
    prefetch={false}
    onClick={() => {
      try {
        writeContactDraft(window.sessionStorage, draft);
      } catch {
        // sessionStorage 접근이 막혀 있으면 초안 없이 연락 페이지로 이동한다.
      }
      onNavigate?.();
    }}
  >
    {label} <span aria-hidden="true">↗</span>
  </LocalizedLink>
);

export { ChatContactDraftButton };
