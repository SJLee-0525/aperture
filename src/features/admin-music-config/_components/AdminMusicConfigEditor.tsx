"use client";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";
import { TimelineRow } from "@/features/admin-music-config/_components/TimelineRow";
import { RecoveryNotice } from "@/features/admin-shell/_components/RecoveryNotice";

import { useMusicConfigAdmin } from "@/features/admin-music-config/_hooks/use-music-config-admin";

import { guardedNavigate } from "@/features/admin-shell/_lib/guarded-navigate";



import { ROUTES } from "@/constants/routes";

import type { TimelineKey } from "@/features/admin-music-config/_hooks/use-music-config-admin";
import type { TimelineEntry } from "@/types/timeline";

import styles from "./AdminMusicConfigEditor.module.css";

/**
 * 음악 설정 — 소개글 + 경력·학력 타임라인 편집. 조립만, 로직은 useMusicConfigAdmin.
 */
const AdminMusicConfigPage = () => {
  const {
    confirmLeave,
    recovery,
    applyRecovered,
    intro,
    career,
    education,
    status,
    error,
    saving,
    saved,
    editIntro,
    addEntry,
    editPeriod,
    editTitle,
    removeEntry,
    moveEntry,
    save,
  } = useMusicConfigAdmin();

  /**
   * career·education 두 타임라인 섹션을 같은 마크업으로 렌더.
   */
  const renderTimeline = (groupKey: TimelineKey, label: string, entries: TimelineEntry[]) => (
    <section className={styles.section}>
      <div className={styles.arrayHead}>
        <h2 className={styles.legend}>{label}</h2>
        <AdminButton variant="secondary" size="xs" onClick={() => addEntry(groupKey)}>
          {`+ ${label} 추가`}
        </AdminButton>
      </div>

      {entries.length === 0 ? (
        <p className={styles.state}>아직 항목이 없습니다.</p>
      ) : (
        <ul className={styles.list}>
          {entries.map((entry, index) => (
            <TimelineRow
              key={index}
              groupKey={groupKey}
              entry={entry}
              index={index}
              isFirst={index === 0}
              isLast={index === entries.length - 1}
              onEditPeriod={editPeriod}
              onEditTitle={editTitle}
              onMove={moveEntry}
              onRemove={removeEntry}
            />
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>소개</h1>
        <p className={styles.hint}>소개글과 경력·학력 타임라인을 편집합니다.</p>
      </header>

      {status === "loading" ? <p className={styles.state}>불러오는 중…</p> : null}

      {status === "error" ? (
        <p className={styles.stateError} role="alert">
          {error ?? "음악 설정을 불러오지 못했습니다."}
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
            <h2 className={styles.legend}>소개글 (첫 문장 = 요약 헤드라인)</h2>
            <div className={styles.grid2}>
              <AdminField label="소개 (한국어)">
                <AdminInput
                  multiline
                  rows={6}
                  value={intro.ko}
                  onChange={(e) => editIntro("ko", e.target.value)}
                />
              </AdminField>
              <AdminField label="소개 (English)">
                <AdminInput
                  multiline
                  rows={6}
                  value={intro.en}
                  onChange={(e) => editIntro("en", e.target.value)}
                />
              </AdminField>
            </div>
          </section>

          {renderTimeline("career", "경력", career)}
          {renderTimeline("education", "학력", education)}

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
              href={ROUTES.ADMIN_MUSIC}
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

export default AdminMusicConfigPage;
