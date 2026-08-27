"use client";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";
import { DevAwardRow } from "@/features/admin-dev-config/_components/DevAwardRow";
import { DevEducationRow } from "@/features/admin-dev-config/_components/DevEducationRow";
import { DevTimelineRow } from "@/features/admin-dev-config/_components/DevTimelineRow";
import { InterviewRow } from "@/features/admin-dev-config/_components/InterviewRow";
import { StackGroupRow } from "@/features/admin-dev-config/_components/StackGroupRow";
import { RecoveryNotice } from "@/features/admin-shell/_components/RecoveryNotice";

import { useDevConfigAdmin } from "@/features/admin-dev-config/_hooks/use-dev-config-admin";

import { ROUTES } from "@/constants/routes";

import styles from "./DevConfigEditor.module.css";

/** 개발 설정 — 소개 리드·인터뷰·기술 스택·학력·경력·수상 편집. 조립만, 로직은 편집 Module과 hook.
 *
 * @returns {JSX.Element}
 *  (연락처·소셜은 /contact, 히어로 타이핑은 랜딩 소관 → 여기 없음.) */
const DevConfigEditor = () => {
  const {
    confirmLeave,
    recovery,
    applyRecovered,
    config,
    status,
    error,
    saving,
    saved,
    edit,
    save,
  } = useDevConfigAdmin();

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>소개</h1>
        <p className={styles.hint}>소개 리드·인터뷰·기술 스택·학력·경력·수상을 편집합니다.</p>
      </header>

      {status === "loading" ? <p className={styles.state}>불러오는 중…</p> : null}

      {status === "error" ? (
        <p className={styles.stateError} role="alert">
          {error ?? "개발 설정을 불러오지 못했습니다."}
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
            <h2 className={styles.legend}>소개 리드 (첫 문장 = 요약 헤드라인)</h2>
            <div className={styles.grid2}>
              <AdminField label="리드 (한국어)">
                <AdminInput
                  multiline
                  rows={3}
                  value={config.heroLead.ko}
                  onChange={(event) =>
                    edit({ type: "heroLead.edit", lang: "ko", value: event.target.value })
                  }
                />
              </AdminField>
              <AdminField label="리드 (English)">
                <AdminInput
                  multiline
                  rows={3}
                  value={config.heroLead.en}
                  onChange={(event) =>
                    edit({ type: "heroLead.edit", lang: "en", value: event.target.value })
                  }
                />
              </AdminField>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.arrayHead}>
              <h2 className={styles.legend}>학력</h2>
              <AdminButton
                variant="secondary"
                size="xs"
                onClick={() => edit({ type: "education.add" })}
              >
                + 학력 추가
              </AdminButton>
            </div>
            {config.education.length === 0 ? (
              <p className={styles.state}>아직 항목이 없습니다.</p>
            ) : (
              <ul className={styles.list}>
                {config.education.map((entry, index) => (
                  <DevEducationRow
                    key={index}
                    entry={entry}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === config.education.length - 1}
                    onEditPeriod={(itemIndex, value) =>
                      edit({ type: "education.period.edit", index: itemIndex, value })
                    }
                    onEditTitle={(itemIndex, lang, value) =>
                      edit({ type: "education.title.edit", index: itemIndex, lang, value })
                    }
                    onMove={(itemIndex, offset) =>
                      edit({ type: "education.move", index: itemIndex, offset })
                    }
                    onRemove={(itemIndex) => edit({ type: "education.remove", index: itemIndex })}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.arrayHead}>
              <h2 className={styles.legend}>인터뷰 (Q&A)</h2>
              <AdminButton
                variant="secondary"
                size="xs"
                onClick={() => edit({ type: "interview.add" })}
              >
                + 문답 추가
              </AdminButton>
            </div>
            {config.interview.length === 0 ? (
              <p className={styles.state}>아직 문답이 없습니다.</p>
            ) : (
              <ul className={styles.list}>
                {config.interview.map((entry, index) => (
                  <InterviewRow
                    key={index}
                    entry={entry}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === config.interview.length - 1}
                    onEdit={(itemIndex, field, lang, value) =>
                      edit({
                        type: "interview.edit",
                        index: itemIndex,
                        field,
                        lang,
                        value,
                      })
                    }
                    onMove={(itemIndex, offset) =>
                      edit({ type: "interview.move", index: itemIndex, offset })
                    }
                    onRemove={(itemIndex) => edit({ type: "interview.remove", index: itemIndex })}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.arrayHead}>
              <h2 className={styles.legend}>수상</h2>
              <AdminButton
                variant="secondary"
                size="xs"
                onClick={() => edit({ type: "award.add", id: crypto.randomUUID() })}
              >
                + 수상 추가
              </AdminButton>
            </div>
            {config.awards.length === 0 ? (
              <p className={styles.state}>아직 수상이 없습니다.</p>
            ) : (
              <ul className={styles.list}>
                {config.awards.map((award, index) => (
                  <DevAwardRow
                    key={index}
                    award={award}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === config.awards.length - 1}
                    onEditYear={(itemIndex, value) =>
                      edit({ type: "award.year.edit", index: itemIndex, value })
                    }
                    onEditProject={(itemIndex, value) =>
                      edit({ type: "award.project.edit", index: itemIndex, value })
                    }
                    onEditField={(itemIndex, field, lang, value) =>
                      edit({ type: "award.field.edit", index: itemIndex, field, lang, value })
                    }
                    onMove={(itemIndex, offset) =>
                      edit({ type: "award.move", index: itemIndex, offset })
                    }
                    onRemove={(itemIndex) => edit({ type: "award.remove", index: itemIndex })}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.arrayHead}>
              <h2 className={styles.legend}>기술 스택</h2>
              <AdminButton
                variant="secondary"
                size="xs"
                onClick={() => edit({ type: "stack.group.add" })}
              >
                + 그룹 추가
              </AdminButton>
            </div>
            {config.stack.length === 0 ? (
              <p className={styles.state}>아직 그룹이 없습니다.</p>
            ) : (
              <ul className={styles.list}>
                {config.stack.map((group, index) => (
                  <StackGroupRow
                    key={index}
                    group={group}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === config.stack.length - 1}
                    onEditCategory={(groupIndex, value) =>
                      edit({ type: "stack.category.edit", index: groupIndex, value })
                    }
                    onAddItem={(groupIndex) => edit({ type: "stack.item.add", index: groupIndex })}
                    onEditItem={(groupIndex, itemIndex, field, value) =>
                      edit({
                        type: "stack.item.edit",
                        index: groupIndex,
                        itemIndex,
                        field,
                        value,
                      })
                    }
                    onRemoveItem={(groupIndex, itemIndex) =>
                      edit({
                        type: "stack.item.remove",
                        index: groupIndex,
                        itemIndex,
                      })
                    }
                    onMove={(groupIndex, offset) =>
                      edit({ type: "stack.group.move", index: groupIndex, offset })
                    }
                    onRemove={(groupIndex) =>
                      edit({ type: "stack.group.remove", index: groupIndex })
                    }
                  />
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.arrayHead}>
              <h2 className={styles.legend}>경력 타임라인</h2>
              <AdminButton
                variant="secondary"
                size="xs"
                onClick={() => edit({ type: "timeline.add" })}
              >
                + 경력 추가
              </AdminButton>
            </div>
            {config.timeline.length === 0 ? (
              <p className={styles.state}>아직 항목이 없습니다.</p>
            ) : (
              <ul className={styles.list}>
                {config.timeline.map((entry, index) => (
                  <DevTimelineRow
                    key={index}
                    entry={entry}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === config.timeline.length - 1}
                    onEditPeriod={(entryIndex, value) =>
                      edit({ type: "timeline.period.edit", index: entryIndex, value })
                    }
                    onEditField={(entryIndex, field, lang, value) =>
                      edit({
                        type: "timeline.field.edit",
                        index: entryIndex,
                        field,
                        lang,
                        value,
                      })
                    }
                    onMove={(entryIndex, offset) =>
                      edit({ type: "timeline.move", index: entryIndex, offset })
                    }
                    onRemove={(entryIndex) => edit({ type: "timeline.remove", index: entryIndex })}
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
              href={ROUTES.ADMIN_DEV}
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

export { DevConfigEditor };
