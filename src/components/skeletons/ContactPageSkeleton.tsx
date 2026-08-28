import { Skeleton } from "@/components/Skeleton";

import styles from "./ContactPageSkeleton.module.css";

const CONTACT_SOCIAL_WIDTHS = [112, 96, 124];

/** 연락 지면 자리표시자 — 소개 문단·소셜 링크·mailto 폼. */
const ContactPageSkeleton = () => (
  <main className={`u-loading-shell ${styles.contact}`} aria-busy="true">
    <header className={styles.contactHead}>
      <Skeleton width={92} height={18} />
      <Skeleton className={styles.contactTitle} width="48%" height={56} />
      <div className={styles.contactLead}>
        <Skeleton width="76%" height={16} />
        <Skeleton width="58%" height={16} />
      </div>
    </header>

    <div className={styles.contactSocials}>
      {CONTACT_SOCIAL_WIDTHS.map((width, index) => (
        <Skeleton key={`contact-social-${index}`} width={width} height={42} radius={0} />
      ))}
    </div>

    <div className={styles.contactForm}>
      <div className={styles.contactGrid}>
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={`contact-field-${index}`} className={styles.contactField}>
            <Skeleton width={64} height={11} />
            <Skeleton height={48} radius={0} />
          </div>
        ))}
      </div>
      <div className={styles.contactField}>
        <Skeleton width={72} height={11} />
        <Skeleton height={132} radius={0} />
      </div>
      <Skeleton width={104} height={48} radius={0} />
    </div>
  </main>
);

export { ContactPageSkeleton };
