import { getPhotos } from "@/lib/content/get-photos";

import styles from "./page.module.css";

/**
 * 작업(Work) — Slice 2에서 <GalleryView>(메이슨리 그리드 + 필터)로 교체.
 * 현재는 chrome 확인용 최소 플레이스홀더 (getter 동작 + 헤더/탭바 검증).
 */
export default async function WorkPage() {
  const photos = await getPhotos();

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>
        작업 <span className={styles.sub}>Work</span>
      </h1>
      <p className={styles.note}>{photos.length} photos · Slice 2에서 메이슨리 그리드로 교체</p>
    </main>
  );
}
