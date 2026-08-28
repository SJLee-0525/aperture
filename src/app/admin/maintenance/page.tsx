import { ArticleOrphanImagePanel } from "@/features/admin-maintenance/_components/ArticleOrphanImagePanel";
import { EmbeddingMigrationPanel } from "@/features/admin-maintenance/_components/EmbeddingMigrationPanel";
import { ImageMigrationPanel } from "@/features/admin-maintenance/_components/ImageMigrationPanel";

import styles from "./page.module.css";

/**
 * 데이터 관리 — 되돌릴 수 없는 일괄 작업을 모아 둔 화면.
 *
 * 페이지 제목이 h1 이고 패널 셋은 h2 다. 패널마다 h1 을 두면 제목 레벨이 오르내린다.
 */
const AdminMaintenancePage = () => (
  <div className={styles.page}>
    <h1 className={styles.title}>데이터 관리</h1>
    <ImageMigrationPanel />
    <EmbeddingMigrationPanel />
    <ArticleOrphanImagePanel />
  </div>
);

export default AdminMaintenancePage;
