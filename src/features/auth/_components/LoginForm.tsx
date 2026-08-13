"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";

import { ROUTES } from "@/constants/routes";
import { signIn } from "@/lib/firebase/auth";

import styles from "./LoginForm.module.css";

/**
 * 관리자 로그인 폼. 성공 시 /admin 으로 이동. (관리자 UI 는 소유자 전용 → 한국어 고정)
 */
const LoginForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace(ROUTES.ADMIN);
    } catch (caught) {
      setError((caught as Error).message);
      setPending(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.head}>
        <h1 className={styles.brand}>Sungjoon Lee.</h1>
        <p className={styles.subtitle}>관리자 로그인</p>
      </div>

      <AdminField label="이메일">
        <AdminInput
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoFocus
        />
      </AdminField>

      <AdminField label="비밀번호">
        <AdminInput
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </AdminField>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <AdminButton variant="primary" type="submit" className={styles.submit} disabled={pending}>
        {pending ? "로그인 중…" : "로그인"}
      </AdminButton>
    </form>
  );
};

export { LoginForm };
