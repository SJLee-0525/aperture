"use client";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";

import { useSiteAdmin } from "@/features/admin-site/_hooks/use-site-admin";

import { ROUTES } from "@/constants/routes";

import styles from "./AdminSiteEditor.module.css";

/** 관리자 소개 — 사진 소개 페이지(/photo/about)의 바이오만 편집. 조립만, 로직은 useSiteAdmin.
 *
 * @returns {JSX.Element}
 *  이름·연락 링크는 about 에 노출되지 않으므로 여기 없음(전역/연락 CMS 추가 시 그쪽에서 편집). */
const AdminSitePage = () => {
  const { confirmLeave, bio, status, error, saving, saved, editBio, save } = useSiteAdmin();

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>소개</h1>
        <p className={styles.hint}>
          사진 소개 페이지(/photo/about)의 바이오를 편집합니다. 첫 문장이 요약 헤드라인이 됩니다.
        </p>
      </header>

      {status === "loading" ? <p className={styles.state}>불러오는 중…</p> : null}

      {status === "error" ? (
        <p className={styles.stateError} role="alert">
          {error ?? "소개 정보를 불러오지 못했습니다."}
        </p>
      ) : null}

      {status === "ready" ? (
        <>
          <section className={styles.section}>
            <h2 className={styles.legend}>바이오 (첫 문장 = 요약 헤드라인)</h2>
            <div className={styles.grid2}>
              <AdminField label="바이오 (한국어)">
                <AdminInput
                  multiline
                  rows={6}
                  value={bio.ko}
                  onChange={(e) => editBio("ko", e.target.value)}
                />
              </AdminField>
              <AdminField label="바이오 (English)">
                <AdminInput
                  multiline
                  rows={6}
                  value={bio.en}
                  onChange={(e) => editBio("en", e.target.value)}
                />
              </AdminField>
            </div>
          </section>

          {error ? (
            <p className={styles.stateError} role="alert">
              {error}
            </p>
          ) : null}

          {saved ? <p className={styles.state}>저장되었습니다.</p> : null}

          <div className={styles.actions}>
            <AdminButton variant="primary" onClick={save} disabled={saving}>
              {saving ? "저장 중…" : "저장"}
            </AdminButton>
            <AdminButton
              variant="secondary"
              href={ROUTES.ADMIN_PHOTO}
              disabled={saving}
              onNavigate={(event) => {
                if (!confirmLeave()) event.preventDefault();
              }}
            >
              취소
            </AdminButton>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default AdminSitePage;
