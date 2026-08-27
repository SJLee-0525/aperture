import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { ROUTES } from "@/constants/routes";

import type { LegalDocument } from "@/features/legal/_lib/legal/legal-document";

/** 사이트 이용과 콘텐츠 안내의 영어 원문. */
const TERMS_EN: LegalDocument = {
  eyebrow: "Terms & Content",
  title: "Site Use & Content Notice",
  effective: "Effective: August 10, 2026",
  sections: [
    {
      title: "Purpose",
      content: (
        <p>
          This personal portfolio shows photography, music, and development work by Sungjoon Lee.
          Unless stated otherwise, information reflects the time it was written or published and
          may be changed or withdrawn without notice.
        </p>
      ),
    },
    {
      title: "Copyright and reuse",
      content: (
        <>
          <p>
            Rights in original photography, writing, design, and other site content belong to
            Sungjoon Lee. Apart from personal viewing and ordinary link sharing, reproduction,
            redistribution, modification, or commercial use requires prior permission.
          </p>
          <p>
            The licence shown in each open-source repository governs code from that repository.
            Performance video, audio, posters, logos, and external materials may carry separate
            rights belonging to performers, composers, photographers, organisers, or other owners.
          </p>
        </>
      ),
    },
    {
      title: "External links and services",
      content: (
        <p>
          GitHub, YouTube, maps, ticketing, and other external links are provided for convenience.
          Their operators are responsible for content, availability, security, and privacy
          practices. A link does not by itself imply endorsement or warranty.
        </p>
      ),
    },
    {
      title: "AI chatbot",
      content: (
        <p>
          Chatbot responses are generated automatically and may be inaccurate or outdated. The
          original portfolio page takes priority. The chatbot does not provide medical, legal,
          financial, or other professional advice.
        </p>
      ),
    },
    {
      title: "Prohibited use",
      content: (
        <p>
          Do not compromise site or visitor safety, bypass security controls, disrupt service,
          infringe rights, or perform unauthorised bulk collection and redistribution. This does
          not restrict normal search indexing or accessibility tools.
        </p>
      ),
    },
    {
      title: "Contact and changes",
      content: (
        <p>
          For content permission, infringement concerns, or questions about this notice, use the{" "}
          <LocalizedLink href={ROUTES.CONTACT}>contact page</LocalizedLink>. Material changes will
          be reflected here with an updated effective date.
        </p>
      ),
    },
  ],
};

export { TERMS_EN };
