import Image from "next/image";

import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { useLang } from "@/features/lang/_hooks/use-lang";

import type { UIDict } from "@/constants/dictionary";
import type { ChatReference, ChatReferenceType } from "@/types/chat";

import styles from "./ChatPanel.module.css";

/** 카드 위의 종류 표시가 읽을 사전 키. `Record` 라 참조 종류가 늘면 컴파일이 막는다. */
const REFERENCE_TYPE_KEYS: Record<ChatReferenceType, keyof UIDict> = {
  article: "chatReferenceTypeArticle",
  music: "chatReferenceTypeMusic",
  photo: "chatReferenceTypePhoto",
  project: "chatReferenceTypeProject",
};

type Props = { reference: ChatReference; onNavigate: () => void };

const ChatReferenceCard = ({ reference, onNavigate }: Props) => {
  const { dict } = useLang();

  return (
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
        <span className={styles.referenceType} data-type={reference.type}>
          {dict[REFERENCE_TYPE_KEYS[reference.type]]}
        </span>
        <strong>{reference.title}</strong>
        <span>{reference.subtitle}</span>
      </span>
    </LocalizedLink>
  );
};

export { ChatReferenceCard };
