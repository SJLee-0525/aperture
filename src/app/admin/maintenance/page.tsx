import { ArticleOrphanImagePanel } from "@/features/admin-maintenance/_components/ArticleOrphanImagePanel";
import { EmbeddingMigrationPanel } from "@/features/admin-maintenance/_components/EmbeddingMigrationPanel";
import { ImageMigrationPanel } from "@/features/admin-maintenance/_components/ImageMigrationPanel";

import styles from "./page.module.css";

const AdminMaintenancePage = () => (
  <div className={styles.page}>
    <ImageMigrationPanel />
    <EmbeddingMigrationPanel />
    <ArticleOrphanImagePanel />
  </div>
);

export default AdminMaintenancePage;
