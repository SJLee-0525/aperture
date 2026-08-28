"use client";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";
import { LinkRow } from "@/features/admin-global/_components/LinkRow";
import { RecoveryNotice } from "@/features/admin-shell/_components/RecoveryNotice";

import { useGlobalAdmin } from "@/features/admin-global/_hooks/use-global-admin";

import { guardedNavigate } from "@/features/admin-shell/_lib/guarded-navigate";



import { ROUTES } from "@/constants/routes";

import styles from "./AdminGlobalEditor.module.css";

/**
 * 관리자 전역 — 메인(/) 랜딩(순환 타이핑·리드) + 연락(/contact) 리드·링크 편집. 조립만, 로직은 useGlobalAdmin.
 */
const AdminGlobalPage = () => {
  const {
    confirmLeave,
    recovery,
    applyRecovered,
    tagline,
    landingLead,
    contactLead,
    links,
    status,
    error,
    saving,
    saved,
    editTagline,
    editLandingLead,
    editContactLead,
    addLink,
    editLink,
    removeLink,
    moveLink,
    save,
  } = useGlobalAdmin();

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>랜딩 · 문의</h1>
        <p className={styles.hint}>
          메인(/)의 순환 타이핑·리드와 문의(/contact) 리드·버튼 링크를 편집합니다.
        </p>
      </header>

      {status === "loading" ? <p className={styles.state}>불러오는 중…</p> : null}

      {status === "error" ? (
        <p className={styles.stateError} role="alert">
          {error ?? "설정을 불러오지 못했습니다."}
        </p>
      ) : null}

      {status === "ready" ? (
        <>
          {recovery.pending ? (
            <RecoveryNotice
              savedAt={recovery.pending.savedAt}
              onRestore={() => {
                const restored = recovery.restore();
                if (restored) applyRecovered(restored);
              }}
              onDiscard={recovery.discard}
            />
          ) : null}
          <section className={styles.section}>
            <h2 className={styles.legend}>
              순환 타이핑 역할 (‘·’ 로 구분 · 예: Photographer · Pianist · Developer)
            </h2>
            <p className={styles.note}>
              메인 이름 아래에서 순환합니다. 역할 색 매칭을 위해 Photographer · Pianist · Developer
              표기를 권장합니다.
            </p>
            <div className={styles.grid2}>
              <AdminField label="타이핑 (한국어)">
                <AdminInput
                  value={tagline.ko}
                  onChange={(e) => editTagline("ko", e.target.value)}
                />
              </AdminField>
              <AdminField label="타이핑 (English)">
                <AdminInput
                  value={tagline.en}
                  onChange={(e) => editTagline("en", e.target.value)}
                />
              </AdminField>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.legend}>랜딩 리드 (메인 소개 문단)</h2>
            <div className={styles.grid2}>
              <AdminField label="리드 (한국어)">
                <AdminInput
                  multiline
                  rows={3}
                  value={landingLead.ko}
                  onChange={(e) => editLandingLead("ko", e.target.value)}
                />
              </AdminField>
              <AdminField label="리드 (English)">
                <AdminInput
                  multiline
                  rows={3}
                  value={landingLead.en}
                  onChange={(e) => editLandingLead("en", e.target.value)}
                />
              </AdminField>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.legend}>문의 리드 (문의 페이지 상단 문단)</h2>
            <div className={styles.grid2}>
              <AdminField label="리드 (한국어)">
                <AdminInput
                  multiline
                  rows={3}
                  value={contactLead.ko}
                  onChange={(e) => editContactLead("ko", e.target.value)}
                />
              </AdminField>
              <AdminField label="리드 (English)">
                <AdminInput
                  multiline
                  rows={3}
                  value={contactLead.en}
                  onChange={(e) => editContactLead("en", e.target.value)}
                />
              </AdminField>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.linksHead}>
              <h2 className={styles.legend}>
                문의 버튼 링크 (문의 페이지 · 헤더 · mailto 폼 대상)
              </h2>
              <AdminButton variant="secondary" size="xs" onClick={addLink}>
                + 링크 추가
              </AdminButton>
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

          {/* 저장 후 화면이 바뀌지 않아 이 문구가 유일한 성공 신호다. */}
          <p className={styles.state} role="status">
            {saved ? "저장되었습니다." : ""}
          </p>

          <div className={styles.actions}>
            <AdminButton variant="primary" onClick={save} disabled={saving}>
              {saving ? "저장 중…" : "저장"}
            </AdminButton>
            <AdminButton
              variant="secondary"
              href={ROUTES.ADMIN}
              disabled={saving}
              onNavigate={guardedNavigate(confirmLeave)}
            >
              취소
            </AdminButton>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default AdminGlobalPage;
