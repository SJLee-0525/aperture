import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { ROUTES } from "@/constants/routes";

import type { LegalDocument } from "@/features/legal/_lib/legal/legal-document";

/** 접근성 목표와 알려진 제한의 영어 원문. */
const ACCESSIBILITY_EN: LegalDocument = {
  eyebrow: "Accessibility",
  title: "Accessibility Statement",
  effective: "Last reviewed: August 10, 2026",
  sections: [
    {
      title: "Commitment",
      content: (
        <p>
          This portfolio aims to meet WCAG 2.2 Level AA. Its content should remain usable with a
          keyboard, screen reader, browser zoom, and across different viewport sizes.
        </p>
      ),
    },
    {
      title: "Measures",
      content: (
        <ul>
          <li>Semantic document structure and a declared language for each page</li>
          <li>Keyboard-operable navigation, menus, dialogs, and forms</li>
          <li>Reduced-motion support and light/dark themes</li>
          <li>Automated axe accessibility regression checks on representative public pages</li>
        </ul>
      ),
    },
    {
      title: "Known limitations",
      content: (
        <p>
          External content such as maps, YouTube, and hCaptcha depends on provider accessibility.
          Photo alternative text and older content remain under review. Passing automated checks
          alone does not establish complete conformance in every user environment.
        </p>
      ),
    },
    {
      title: "Feedback",
      content: (
        <p>
          If you encounter a barrier, please share the page, environment, and problem through the{" "}
          <LocalizedLink href={ROUTES.CONTACT}>contact page</LocalizedLink>. Where possible, the
          operator will suggest another way to access the content and review the reported issue.
        </p>
      ),
    },
    {
      title: "Technical scope",
      content: (
        <p>
          The site relies on HTML, CSS, JavaScript, and WAI-ARIA support in current major browsers.
          Blocking JavaScript may limit navigation, dialogs, maps, and chatbot features, while
          explicit public URLs aim to retain access to core content.
        </p>
      ),
    },
  ],
};

export { ACCESSIBILITY_EN };
