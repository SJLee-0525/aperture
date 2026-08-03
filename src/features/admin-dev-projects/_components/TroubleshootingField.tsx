"use client";

import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { DevTroubleshooting } from "@/types/dev";

import styles from "./TroubleshootingField.module.css";

type Props = {
  entries: DevTroubleshooting[];
  onChange: (entries: DevTroubleshooting[]) => void;
};

type TextFieldKey = "title" | "problem" | "solution" | "result";

/** 새 항목 — 폼 상태에서는 result 를 항상 채워 undefined 분기를 없앤다(저장 시 빈 값이면 키 생략). */
const emptyEntry = (): DevTroubleshooting => ({
  title: { ...EMPTY_TEXT },
  problem: { ...EMPTY_TEXT },
  solution: { ...EMPTY_TEXT },
  result: { ...EMPTY_TEXT },
});

/** 항목별 제목/문제/해결/결과(ko·en) 필드 정의 — 렌더 순서 그대로. */
const FIELDS: { key: TextFieldKey; label: string; multiline: boolean }[] = [
  { key: "title", label: "제목", multiline: false },
  { key: "problem", label: "문제", multiline: true },
  { key: "solution", label: "해결", multiline: true },
  { key: "result", label: "결과 (선택)", multiline: true },
];

/** 트러블슈팅 구조화 편집 필드 — 항목 추가/삭제 + 항목당 제목·문제·해결·결과 ko/en 입력. */
const TroubleshootingField = ({ entries, onChange }: Props) => {
  const add = () => onChange([...entries, emptyEntry()]);
  const remove = (index: number) => onChange(entries.filter((_, i) => i !== index));

  const edit = (index: number, field: TextFieldKey, langKey: "ko" | "en", value: string) =>
    onChange(
      entries.map((entry, i) =>
        i === index
          ? { ...entry, [field]: { ...(entry[field] ?? EMPTY_TEXT), [langKey]: value } }
          : entry,
      ),
    );

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <button type="button" className={styles.add} onClick={add}>
          + 항목 추가
        </button>
      </div>

      {entries.length === 0 ? (
        <p className={styles.note}>아직 항목이 없습니다.</p>
      ) : (
        <ul className={styles.list}>
          {entries.map((entry, index) => (
            <li key={index} className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.cardIndex}>#{index + 1}</span>
                <button type="button" className={styles.remove} onClick={() => remove(index)}>
                  삭제
                </button>
              </div>
              {FIELDS.map(({ key, label, multiline }) => (
                <div key={key} className={styles.fieldBlock}>
                  <span className={styles.label}>{label}</span>
                  <div className={styles.grid2}>
                    {(["ko", "en"] as const).map((langKey) =>
                      multiline ? (
                        <textarea
                          key={langKey}
                          className={styles.textarea}
                          rows={2}
                          value={entry[key]?.[langKey] ?? ""}
                          placeholder={langKey === "ko" ? "한국어" : "English"}
                          onChange={(e) => edit(index, key, langKey, e.target.value)}
                        />
                      ) : (
                        <input
                          key={langKey}
                          className={styles.input}
                          value={entry[key]?.[langKey] ?? ""}
                          placeholder={langKey === "ko" ? "한국어" : "English"}
                          onChange={(e) => edit(index, key, langKey, e.target.value)}
                        />
                      ),
                    )}
                  </div>
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export { TroubleshootingField };
