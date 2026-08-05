import Image from "next/image";

import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";
import type { ChatReference } from "@/types/chat";

import styles from "./ChatPanel.module.css";

type Props = { reference: ChatReference; onNavigate: () => void };

const ChatReferenceCard = ({ reference, onNavigate }: Props) => (
  <LocalizedLink
    className={styles.reference}
    href={reference.href}
    scroll={false}
    prefetch={false}
    onClick={onNavigate}
    aria-label={`${reference.title} — ${reference.subtitle}`}
  >
    <span className={styles.referenceImage} data-protected-image>
      {reference.image ? (
        <Image
          src={reference.image.url}
          alt=""
          fill
          sizes="72px"
          className={styles.referenceImageContent}
          draggable={false}
        />
      ) : (
        <span className={styles.referencePlaceholder} aria-hidden="true" />
      )}
    </span>
    <span className={styles.referenceCopy}>
      <span className={styles.referenceType}>{reference.type}</span>
      <strong>{reference.title}</strong>
      <span>{reference.subtitle}</span>
    </span>
  </LocalizedLink>
);

export { ChatReferenceCard };
