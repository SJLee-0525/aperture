import { PhotoTile } from "@/components/PhotoTile";
import type { Lang } from "@/types/lang";
import type { Photo } from "@/types/photo";

import styles from "./PhotoGrid.module.css";

type Props = {
  photos: Photo[];
  lang: Lang;
  square: boolean;
  emptyLabel: string;
};

/** 사진 그리드 — 메이슨리(CSS columns) 또는 정사각(grid). 빈 결과 시 안내 문구. */
const PhotoGrid = ({ photos, lang, square, emptyLabel }: Props) => {
  if (photos.length === 0) {
    return <p className={styles.empty}>{emptyLabel}</p>;
  }

  return (
    <div className={square ? styles.square : styles.mason}>
      {photos.map((photo, index) => (
        <div key={photo.id} className={styles.cell}>
          {/* 첫 4장은 LCP 보호 위해 priority(eager) */}
          <PhotoTile photo={photo} lang={lang} square={square} priority={index < 4} />
        </div>
      ))}
    </div>
  );
};

export { PhotoGrid };
