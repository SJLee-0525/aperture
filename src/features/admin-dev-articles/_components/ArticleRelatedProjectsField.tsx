"use client";

import { Icon } from "@/components/Icon";
import type { DevProjectOption } from "@/features/admin-dev-articles/_lib/dev-project-options";

import styles from "./ArticleForm.module.css";

type Props = {
  projects: DevProjectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
};

/**
 * 연관 프로젝트 선택. 고른 순서가 곧 상세에서 보여 줄 순서다(계획 §7).
 *
 * 목록에 없는 id(삭제된 프로젝트)도 행으로 남긴다. 조용히 빼면 관계가 사라진 것을 모른 채
 * 발행하게 되고, 공개 화면에서만 카드가 비어 보인다. 비공개 프로젝트는 고를 수 있지만
 * 발행 조건 검사가 막는다 — 글을 먼저 쓰고 프로젝트를 나중에 공개하는 순서를 허용하기 위해서다.
 *
 * @param {Props} props
 * @param {DevProjectOption[]} props.projects 고를 수 있는 프로젝트 전체.
 * @param {string[]} props.selected 고른 프로젝트 id. 배열 순서가 표시 순서다.
 * @param {(next: string[]) => void} props.onChange 선택이나 순서가 바뀌었을 때.
 * @returns {JSX.Element}
 */
const ArticleRelatedProjectsField = ({ projects, selected, onChange }: Props) => {
  const move = (index: number, step: number) => {
    const target = index + step;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const label = (id: string) => projects.find((project) => project.id === id)?.title.ko ?? id;
  const missing = (id: string) => {
    const project = projects.find((item) => item.id === id);
    if (!project) return "삭제됨";
    return project.published ? "" : "비공개";
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.legend}>연관 프로젝트</h2>

      <div className={styles.chips}>
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            className={styles.chip}
            aria-pressed={selected.includes(project.id)}
            onClick={() =>
              onChange(
                selected.includes(project.id)
                  ? selected.filter((id) => id !== project.id)
                  : [...selected, project.id],
              )
            }
          >
            {project.title.ko}
            {project.published ? "" : " (비공개)"}
          </button>
        ))}
      </div>

      {selected.length === 0 ? (
        <p className={styles.note}>고른 프로젝트가 없습니다.</p>
      ) : (
        <ul className={styles.orderedList}>
          {selected.map((id, index) => (
            <li key={id} className={styles.orderedRow}>
              <span className={styles.orderedTitle}>
                {index + 1}. {label(id)}
              </span>
              {missing(id) ? <span className={styles.orderedWarn}>{missing(id)}</span> : null}
              <button
                type="button"
                className={styles.move}
                aria-label={`${label(id)} 위로`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <Icon name="arrowUp" size={14} />
              </button>
              <button
                type="button"
                className={styles.move}
                aria-label={`${label(id)} 아래로`}
                disabled={index === selected.length - 1}
                onClick={() => move(index, 1)}
              >
                <Icon name="arrowDown" size={14} />
              </button>
              <button
                type="button"
                className={styles.remove}
                onClick={() => onChange(selected.filter((item) => item !== id))}
              >
                제외
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export { ArticleRelatedProjectsField };
