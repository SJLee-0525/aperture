import { Skeleton } from "@/components/Skeleton";

import styles from "./PageTitleSkeleton.module.css";

/** 지면 제목 자리. 높이를 h1 규격으로 잡아 데이터가 도착해도 아래가 밀리지 않는다. */
const PageTitleSkeleton = () => (
  <div className={styles.titleSlot}>
    <Skeleton width={150} height={34} />
  </div>
);

export { PageTitleSkeleton };
