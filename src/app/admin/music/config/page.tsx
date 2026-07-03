"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { TimelineRow } from "@/features/admin-music-config/TimelineRow";
import { useMusicConfigAdmin } from "@/features/admin-music-config/use-music-config-admin";
import type { TimelineKey } from "@/features/admin-music-config/use-music-config-admin";
import type { TimelineEntry } from "@/types/timeline";

import styles from "./page.module.css";

/** 음악 설정 — 소개글 + 경력·학력 타임라인 편집. 조립만, 로직은 useMusicConfigAdmin. */
const AdminMusicConfigPage = () => {
  const {
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

  /** career·education 두 타임라인 섹션을 같은 마크업으로 렌더. */
  const renderTimeline = (groupKey: TimelineKey, label: string, entries: TimelineEntry[]) => (
    <section className={styles.section}>
      <div className={styles.arrayHead}>
        <h2 className={styles.legend}>{label}</h2>
        <button type="button" className={styles.add} onClick={() => addEntry(groupKey)}>
          + 항목 추가
        </button>
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
        <h1 className={styles.title}>음악 소개 설정</h1>
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
          <section className={styles.section}>
            <h2 className={styles.legend}>소개글 (첫 문장 = 요약 헤드라인)</h2>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span className={styles.label}>소개 (한국어)</span>
                <textarea
                  className={styles.textarea}
                  rows={6}
                  value={intro.ko}
                  onChange={(e) => editIntro("ko", e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>소개 (English)</span>
                <textarea
                  className={styles.textarea}
                  rows={6}
                  value={intro.en}
                  onChange={(e) => editIntro("en", e.target.value)}
                />
              </label>
            </div>
          </section>

          {renderTimeline("career", "경력", career)}
          {renderTimeline("education", "학력", education)}

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
            <Link href={ROUTES.ADMIN_MUSIC} className={styles.cancel}>
              취소
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default AdminMusicConfigPage;
