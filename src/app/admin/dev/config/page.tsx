"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { DevTimelineRow } from "@/features/admin-dev-config/_components/DevTimelineRow";
import type { LocalizedField } from "@/features/admin-dev-config/_components/DevTimelineRow";
import { InterviewRow } from "@/features/admin-dev-config/_components/InterviewRow";
import { StackGroupRow } from "@/features/admin-dev-config/_components/StackGroupRow";
import { useDevConfigAdmin } from "@/features/admin-dev-config/_hooks/use-dev-config-admin";
import type { DevStackItem } from "@/types/dev";

import styles from "./page.module.css";

/** 배열에서 index 항목을 offset 만큼 이동한 새 배열(범위 밖이면 원본). */
const swap = <T,>(list: T[], index: number, offset: -1 | 1): T[] => {
  const target = index + offset;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

/** 개발 설정 — 소개 리드·인터뷰·기술 스택·경력 편집. 조립만, 로직은 useDevConfigAdmin.
 *  (연락처·소셜은 /contact, 히어로 타이핑은 랜딩 소관 → 여기 없음.) */
const AdminDevConfigPage = () => {
  const { config, status, error, saving, saved, patch, save } = useDevConfigAdmin();

  // interview -----------------------------------------------------------
  const addInterview = () =>
    patch({ interview: [...config.interview, { q: { ko: "", en: "" }, a: { ko: "", en: "" } }] });
  const editInterview = (index: number, field: "q" | "a", lang: "ko" | "en", value: string) =>
    patch({
      interview: config.interview.map((item, i) =>
        i === index ? { ...item, [field]: { ...item[field], [lang]: value } } : item,
      ),
    });
  const moveInterview = (index: number, offset: -1 | 1) =>
    patch({ interview: swap(config.interview, index, offset) });
  const removeInterview = (index: number) =>
    patch({ interview: config.interview.filter((_, i) => i !== index) });

  // stack ---------------------------------------------------------------
  const addStackGroup = () => patch({ stack: [...config.stack, { category: "", items: [] }] });
  const editStackCategory = (index: number, value: string) =>
    patch({
      stack: config.stack.map((g, i) => (i === index ? { ...g, category: value } : g)),
    });
  const addStackItem = (index: number) =>
    patch({
      stack: config.stack.map((g, i) =>
        i === index ? { ...g, items: [...g.items, { name: "", bg: "#000000", fg: "#ffffff" }] } : g,
      ),
    });
  const editStackItem = (
    index: number,
    itemIndex: number,
    field: keyof DevStackItem,
    value: string,
  ) =>
    patch({
      stack: config.stack.map((g, i) =>
        i === index
          ? {
              ...g,
              items: g.items.map((it, j) => (j === itemIndex ? { ...it, [field]: value } : it)),
            }
          : g,
      ),
    });
  const removeStackItem = (index: number, itemIndex: number) =>
    patch({
      stack: config.stack.map((g, i) =>
        i === index ? { ...g, items: g.items.filter((_, j) => j !== itemIndex) } : g,
      ),
    });
  const moveStackGroup = (index: number, offset: -1 | 1) =>
    patch({ stack: swap(config.stack, index, offset) });
  const removeStackGroup = (index: number) =>
    patch({ stack: config.stack.filter((_, i) => i !== index) });

  // timeline ------------------------------------------------------------
  const addTimeline = () =>
    patch({
      timeline: [
        ...config.timeline,
        {
          period: "",
          title: { ko: "", en: "" },
          role: { ko: "", en: "" },
          desc: { ko: "", en: "" },
        },
      ],
    });
  const editTimelinePeriod = (index: number, value: string) =>
    patch({
      timeline: config.timeline.map((t, i) => (i === index ? { ...t, period: value } : t)),
    });
  const editTimelineField = (
    index: number,
    field: LocalizedField,
    lang: "ko" | "en",
    value: string,
  ) =>
    patch({
      timeline: config.timeline.map((t, i) =>
        i === index ? { ...t, [field]: { ...t[field], [lang]: value } } : t,
      ),
    });
  const moveTimeline = (index: number, offset: -1 | 1) =>
    patch({ timeline: swap(config.timeline, index, offset) });
  const removeTimeline = (index: number) =>
    patch({ timeline: config.timeline.filter((_, i) => i !== index) });

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>소개</h1>
        <p className={styles.hint}>소개 리드·인터뷰·기술 스택·경력을 편집합니다.</p>
      </header>

      {status === "loading" ? <p className={styles.state}>불러오는 중…</p> : null}

      {status === "error" ? (
        <p className={styles.stateError} role="alert">
          {error ?? "개발 설정을 불러오지 못했습니다."}
        </p>
      ) : null}

      {status === "ready" ? (
        <>
          <section className={styles.section}>
            <h2 className={styles.legend}>소개 리드 (첫 문장 = 요약 헤드라인)</h2>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span className={styles.label}>리드 (한국어)</span>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={config.heroLead.ko}
                  onChange={(e) => patch({ heroLead: { ...config.heroLead, ko: e.target.value } })}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>리드 (English)</span>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={config.heroLead.en}
                  onChange={(e) => patch({ heroLead: { ...config.heroLead, en: e.target.value } })}
                />
              </label>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.arrayHead}>
              <h2 className={styles.legend}>인터뷰 (Q&A)</h2>
              <button type="button" className={styles.add} onClick={addInterview}>
                + 문답 추가
              </button>
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
                    onEdit={editInterview}
                    onMove={moveInterview}
                    onRemove={removeInterview}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.arrayHead}>
              <h2 className={styles.legend}>기술 스택</h2>
              <button type="button" className={styles.add} onClick={addStackGroup}>
                + 그룹 추가
              </button>
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
                    onEditCategory={editStackCategory}
                    onAddItem={addStackItem}
                    onEditItem={editStackItem}
                    onRemoveItem={removeStackItem}
                    onMove={moveStackGroup}
                    onRemove={removeStackGroup}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.arrayHead}>
              <h2 className={styles.legend}>경력 타임라인</h2>
              <button type="button" className={styles.add} onClick={addTimeline}>
                + 항목 추가
              </button>
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
                    onEditPeriod={editTimelinePeriod}
                    onEditField={editTimelineField}
                    onMove={moveTimeline}
                    onRemove={removeTimeline}
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
            <Link href={ROUTES.ADMIN_DEV} className={styles.cancel}>
              취소
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default AdminDevConfigPage;
