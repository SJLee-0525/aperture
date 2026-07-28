"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type KeyboardEvent } from "react";

import { ROUTES } from "@/constants/routes";
import { devProjects, type DevProjectInput } from "@/lib/firebase/dev";
import { hasText } from "@/lib/i18n/has-text";
import type { DevProject, DevTroubleshooting } from "@/types/dev";
import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";
import type { SiteLink } from "@/types/site";

import { DevImageField } from "./DevImageField";
import styles from "./ProjectForm.module.css";
import { TroubleshootingField } from "./TroubleshootingField";

type Props = {
  projectId: string;
  /** 있으면 수정 모드. */
  initial?: DevProject;
};

/** 빈 프로젝트 초기 상태. */
const emptyInput = (): DevProjectInput => ({
  title: { ko: "", en: "" },
  category: { ko: "", en: "" },
  year: "",
  period: { ko: "", en: "" },
  position: { ko: "", en: "" },
  summary: { ko: "", en: "" },
  overview: { ko: "", en: "" },
  features: [],
  roles: [],
  troubleshooting: [],
  achievements: [],
  techTags: [],
  links: [],
  cover: null,
  images: [],
  // 새 프로젝트는 order 0 — 목록 상단에 오며, dnd 정렬로 조정한다.
  order: 0,
  published: false,
});

const fromProject = (project: DevProject): DevProjectInput => {
  const { id: _id, ...rest } = project;
  void _id;
  return rest;
};

/** 이중언어 배열(features·roles·achievements) 편집을 한 종류 로직으로 다루기 위한 키. */
type LocalizedArrayKey = "features" | "roles" | "achievements";

/** 공유 프로젝트 폼 — 이중언어 필드 + 담당·트러블슈팅·기술·링크·이미지 + 저장. */
const ProjectForm = ({ projectId, initial }: Props) => {
  const router = useRouter();
  const isEdit = initial != null;

  const [form, setForm] = useState<DevProjectInput>(() =>
    initial ? fromProject(initial) : emptyInput(),
  );
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const patch = (next: Partial<DevProjectInput>) => setForm((prev) => ({ ...prev, ...next }));

  // 이중언어 배열 (roles·troubleshooting) --------------------------------
  const addLocalized = (key: LocalizedArrayKey) =>
    patch({ [key]: [...form[key], { ko: "", en: "" }] } as Partial<DevProjectInput>);

  const editLocalized = (
    key: LocalizedArrayKey,
    index: number,
    field: "ko" | "en",
    value: string,
  ) =>
    patch({
      [key]: form[key].map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    } as Partial<DevProjectInput>);

  const removeLocalized = (key: LocalizedArrayKey, index: number) =>
    patch({ [key]: form[key].filter((_, i) => i !== index) } as Partial<DevProjectInput>);

  // 기술 태그 (평면 문자열) ---------------------------------------------
  const addTag = () => {
    const value = tagDraft.trim();
    if (!value || form.techTags.includes(value)) {
      setTagDraft("");
      return;
    }
    patch({ techTags: [...form.techTags, value] });
    setTagDraft("");
  };
  const onTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  };
  const removeTag = (tag: string) => patch({ techTags: form.techTags.filter((t) => t !== tag) });

  // 링크 (label + href) -------------------------------------------------
  const addLink = () => patch({ links: [...form.links, { label: "", href: "" }] });
  const editLink = (index: number, field: keyof SiteLink, value: string) =>
    patch({
      links: form.links.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
    });
  const removeLink = (index: number) => patch({ links: form.links.filter((_, i) => i !== index) });

  // 이미지 --------------------------------------------------------------
  const onCoverChange = (cover: ImageMeta | null) => patch({ cover });
  const onImagesChange = (images: ImageMeta[]) => patch({ images });

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.title.ko.trim()) {
      setError("제목(한국어)을 입력하세요.");
      return;
    }

    // 빈 배열 항목은 저장 시 제거.
    const cleanLocalized = (items: LocalizedText[]) => items.filter(hasText);
    // 전부 빈 항목 드롭 + result 빈 값이면 키 자체 생략 — Firestore 는 배열 내부 map 의 undefined 값을 거부한다.
    const cleanTroubleshooting = (items: DevTroubleshooting[]): DevTroubleshooting[] =>
      items
        .filter(
          (t) =>
            hasText(t.title) ||
            hasText(t.problem) ||
            hasText(t.solution) ||
            (t.result != null && hasText(t.result)),
        )
        .map(({ title, problem, solution, result }) => ({
          title,
          problem,
          solution,
          ...(result != null && hasText(result) ? { result } : {}),
        }));
    const input: DevProjectInput = {
      ...form,
      features: cleanLocalized(form.features),
      roles: cleanLocalized(form.roles),
      troubleshooting: cleanTroubleshooting(form.troubleshooting),
      achievements: cleanLocalized(form.achievements),
      techTags: form.techTags.map((t) => t.trim()).filter(Boolean),
      links: form.links.filter((link) => link.label.trim() || link.href.trim()),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await devProjects.update(projectId, input);
      } else {
        await devProjects.create(projectId, input);
      }
      router.replace(ROUTES.ADMIN_DEV_PROJECTS);
    } catch (caught) {
      setError((caught as Error).message);
      setSaving(false);
    }
  };

  /** roles·troubleshooting 두 섹션을 같은 마크업으로 렌더. */
  const renderLocalizedArray = (key: LocalizedArrayKey, legend: string, addLabel: string) => (
    <section className={styles.section}>
      <div className={styles.arrayHead}>
        <h2 className={styles.legend}>{legend}</h2>
        <button type="button" className={styles.add} onClick={() => addLocalized(key)}>
          {addLabel}
        </button>
      </div>
      {form[key].length === 0 ? (
        <p className={styles.note}>아직 항목이 없습니다.</p>
      ) : (
        <ul className={styles.arrayList}>
          {form[key].map((item, index) => (
            <li key={index} className={styles.arrayRow}>
              <div className={styles.grid2}>
                <input
                  className={styles.input}
                  value={item.ko}
                  placeholder="한국어"
                  onChange={(e) => editLocalized(key, index, "ko", e.target.value)}
                />
                <input
                  className={styles.input}
                  value={item.en}
                  placeholder="English"
                  onChange={(e) => editLocalized(key, index, "en", e.target.value)}
                />
              </div>
              <button
                type="button"
                className={styles.remove}
                onClick={() => removeLocalized(key, index)}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <header className={styles.head}>
        <h1 className={styles.title}>{isEdit ? "프로젝트 수정" : "새 프로젝트"}</h1>
      </header>

      <section className={styles.section}>
        <h2 className={styles.legend}>제목</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>제목 (한국어) *</span>
            <input
              className={styles.input}
              value={form.title.ko}
              onChange={(e) => patch({ title: { ...form.title, ko: e.target.value } })}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>제목 (English)</span>
            <input
              className={styles.input}
              value={form.title.en}
              onChange={(e) => patch({ title: { ...form.title, en: e.target.value } })}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>분류 · 연도</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>분류 (한국어)</span>
            <input
              className={styles.input}
              value={form.category.ko}
              placeholder="SSAFY 관통 프로젝트"
              onChange={(e) => patch({ category: { ...form.category, ko: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>분류 (English)</span>
            <input
              className={styles.input}
              value={form.category.en}
              onChange={(e) => patch({ category: { ...form.category, en: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>연도</span>
            <input
              className={styles.input}
              value={form.year}
              placeholder="2025"
              onChange={(e) => patch({ year: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>기간 · 포지션</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>기간 (한국어)</span>
            <input
              className={styles.input}
              value={form.period.ko}
              placeholder="2025. 12. — 현재"
              onChange={(e) => patch({ period: { ...form.period, ko: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>기간 (English)</span>
            <input
              className={styles.input}
              value={form.period.en}
              placeholder="Dec 2025 — Present"
              onChange={(e) => patch({ period: { ...form.period, en: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>포지션 (한국어)</span>
            <input
              className={styles.input}
              value={form.position.ko}
              placeholder="Frontend 전체 · 6인 팀 (FE 1 · BE 2 · AI 3)"
              onChange={(e) => patch({ position: { ...form.position, ko: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>포지션 (English)</span>
            <input
              className={styles.input}
              value={form.position.en}
              placeholder="Sole frontend engineer · team of 6"
              onChange={(e) => patch({ position: { ...form.position, en: e.target.value } })}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>요약 (카드 한 줄)</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>요약 (한국어)</span>
            <textarea
              className={styles.textarea}
              rows={2}
              value={form.summary.ko}
              onChange={(e) => patch({ summary: { ...form.summary, ko: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>요약 (English)</span>
            <textarea
              className={styles.textarea}
              rows={2}
              value={form.summary.en}
              onChange={(e) => patch({ summary: { ...form.summary, en: e.target.value } })}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>개요</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>개요 (한국어)</span>
            <textarea
              className={styles.textarea}
              rows={5}
              value={form.overview.ko}
              onChange={(e) => patch({ overview: { ...form.overview, ko: e.target.value } })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>개요 (English)</span>
            <textarea
              className={styles.textarea}
              rows={5}
              value={form.overview.en}
              onChange={(e) => patch({ overview: { ...form.overview, en: e.target.value } })}
            />
          </label>
        </div>
      </section>

      {renderLocalizedArray("features", "주요 기능", "+ 항목 추가")}
      {renderLocalizedArray("roles", "담당 · 주요 작업", "+ 항목 추가")}

      <section className={styles.section}>
        <h2 className={styles.legend}>트러블슈팅</h2>
        <TroubleshootingField
          entries={form.troubleshooting}
          onChange={(troubleshooting) => patch({ troubleshooting })}
        />
      </section>

      {renderLocalizedArray("achievements", "성과 · 수상", "+ 항목 추가")}

      <section className={styles.section}>
        <div className={styles.arrayHead}>
          <h2 className={styles.legend}>기술 스택 (태그)</h2>
        </div>
        <div className={styles.tagInputRow}>
          <input
            className={styles.input}
            value={tagDraft}
            placeholder="기술명 입력 후 Enter (예: React)"
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={onTagKeyDown}
          />
          <button type="button" className={styles.add} onClick={addTag}>
            + 추가
          </button>
        </div>
        {form.techTags.length > 0 ? (
          <ul className={styles.chips}>
            {form.techTags.map((tag) => (
              <li key={tag} className={styles.chip}>
                <span>{tag}</span>
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={`${tag} 삭제`}
                  onClick={() => removeTag(tag)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.note}>아직 태그가 없습니다.</p>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.arrayHead}>
          <h2 className={styles.legend}>링크 (GitHub · Live 등)</h2>
          <button type="button" className={styles.add} onClick={addLink}>
            + 링크 추가
          </button>
        </div>
        {form.links.length === 0 ? (
          <p className={styles.note}>아직 링크가 없습니다.</p>
        ) : (
          <ul className={styles.arrayList}>
            {form.links.map((link, index) => (
              <li key={index} className={styles.linkRow}>
                <input
                  className={styles.linkLabel}
                  value={link.label}
                  placeholder="GitHub"
                  onChange={(e) => editLink(index, "label", e.target.value)}
                />
                <input
                  className={styles.input}
                  value={link.href}
                  placeholder="https://…"
                  onChange={(e) => editLink(index, "href", e.target.value)}
                />
                <button type="button" className={styles.remove} onClick={() => removeLink(index)}>
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>이미지</h2>
        <DevImageField
          projectId={projectId}
          cover={form.cover}
          images={form.images}
          onCoverChange={onCoverChange}
          onImagesChange={onImagesChange}
        />
      </section>

      <section className={styles.section}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => patch({ published: e.target.checked })}
          />
          <span>공개 (방문자에게 표시)</span>
        </label>
      </section>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={saving}>
          {saving ? "저장 중…" : isEdit ? "수정 저장" : "프로젝트 저장"}
        </button>
        <button
          type="button"
          className={styles.cancel}
          onClick={() => router.replace(ROUTES.ADMIN_DEV_PROJECTS)}
          disabled={saving}
        >
          취소
        </button>
      </div>
    </form>
  );
};

export { ProjectForm };
