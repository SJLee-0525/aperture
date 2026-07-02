"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { LinkRow } from "@/features/admin-site/LinkRow";
import { useSiteAdmin } from "@/features/admin-site/use-site-admin";

import styles from "./page.module.css";

/** 관리자 소개 — 이름·바이오·연락처 링크 편집. 조립만, 로직은 useSiteAdmin. */
const AdminSitePage = () => {
  const {
    name,
    bio,
    links,
    status,
    error,
    saving,
    saved,
    editName,
    editBio,
    addLink,
    editLink,
    removeLink,
    moveLink,
    save,
  } = useSiteAdmin();

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>소개</h1>
        <p className={styles.hint}>이름·바이오·연락처 링크를 편집합니다.</p>
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
            <h2 className={styles.legend}>이름</h2>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span className={styles.label}>이름 (한국어)</span>
                <input
                  className={styles.input}
                  value={name.ko}
                  onChange={(e) => editName("ko", e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>이름 (English)</span>
                <input
                  className={styles.input}
                  value={name.en}
                  onChange={(e) => editName("en", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.legend}>바이오</h2>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span className={styles.label}>바이오 (한국어)</span>
                <textarea
                  className={styles.textarea}
                  rows={5}
                  value={bio.ko}
                  onChange={(e) => editBio("ko", e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>바이오 (English)</span>
                <textarea
                  className={styles.textarea}
                  rows={5}
                  value={bio.en}
                  onChange={(e) => editBio("en", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.linksHead}>
              <h2 className={styles.legend}>연락처 링크</h2>
              <button type="button" className={styles.add} onClick={addLink}>
                + 링크 추가
              </button>
            </div>

            {links.length === 0 ? (
              <p className={styles.state}>아직 링크가 없습니다.</p>
            ) : (
              <ul className={styles.list}>
                {links.map((link, index) => (
                  <LinkRow
                    key={index}
                    link={link}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === links.length - 1}
                    onEdit={editLink}
                    onMove={moveLink}
                    onRemove={removeLink}
                  />
                ))}
              </ul>
            )}
          </section>

          {error ? (
            <p className={styles.stateError} role="alert">
              {error}
            </p>
          ) : null}

          {saved ? <p className={styles.state}>저장되었습니다.</p> : null}

          <div className={styles.actions}>
            <button type="button" className={styles.save} onClick={save} disabled={saving}>
              {saving ? "저장 중…" : "저장"}
            </button>
            <Link href={ROUTES.ADMIN} className={styles.cancel}>
              취소
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default AdminSitePage;
