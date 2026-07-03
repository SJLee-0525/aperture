import { LoginForm } from "@/features/auth/_components/LoginForm";

import styles from "./page.module.css";

const AdminLoginPage = () => (
  <main className={styles.main}>
    <LoginForm />
  </main>
);

export default AdminLoginPage;
