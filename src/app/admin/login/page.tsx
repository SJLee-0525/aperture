import { LoginForm } from "@/features/auth/LoginForm";

import styles from "./page.module.css";

const AdminLoginPage = () => (
  <main className={styles.main}>
    <LoginForm />
  </main>
);

export default AdminLoginPage;
