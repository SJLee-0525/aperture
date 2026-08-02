import { EmbeddingMigrationPanel } from "@/features/admin-maintenance/_components/EmbeddingMigrationPanel";
import { ImageMigrationPanel } from "@/features/admin-maintenance/_components/ImageMigrationPanel";

import styles from "./page.module.css";

const AdminMaintenancePage = () => (
  <div className={styles.page}>
    <ImageMigrationPanel />
    <EmbeddingMigrationPanel />
  </div>
);

export default AdminMaintenancePage;
