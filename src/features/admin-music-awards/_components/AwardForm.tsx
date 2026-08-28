"use client";

import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";
import { LocalizedFieldPair } from "@/components/LocalizedFieldPair";
import base from "@/features/admin-shell/_components/admin-form.module.css";
import { AdminFormShell } from "@/features/admin-shell/_components/AdminFormShell";

import { useAwardEditor } from "@/features/admin-music-awards/_hooks/use-award-editor";

import { issueFor } from "@/lib/admin/field-issue";

import type { MusicAward } from "@/types/music";

type Props = {
  awardId: string;
  /** 있으면 수정 모드. */
  initial?: MusicAward;
};

/**
 * 공유 수상 폼 — 연도·이중언어 이름·장소·설명 + 저장. 조립만 하고 상태는 훅이 갖는다.
 *
 * @param props.initial - 있으면 수정 모드.
 */
const AwardForm = ({ awardId, initial }: Props) => {
  const {
    recovery,
    applyForm,
    form,
    issues,
    formRef,
    isEdit,
    error,
    saving,
    patch,
    cancel,
    submit,
  } = useAwardEditor(awardId, initial);

  return (
    <AdminFormShell
      title={isEdit ? "수상 수정" : "새 수상"}
      formRef={formRef}
      onSubmit={submit}
      onCancel={cancel}
      busy={saving}
      saving={saving}
      error={error}
      recovery={recovery}
      onRestore={(restored) => applyForm(restored as typeof form)}
    >

      <section className={base.section}>
        <h2 className={base.legend}>연도 · 장소</h2>
        <div className={base.grid2}>
          <AdminField label="연도" required field="year" error={issueFor(issues, "year")}>
            <AdminInput
              type="number"
              value={form.year}
              placeholder="2025"
              onChange={(event) => patch({ year: event.target.value })}
              required
            />
          </AdminField>
          <AdminField label="장소">
            <AdminInput
              value={form.place}
              placeholder="Geneva, CH"
              onChange={(event) => patch({ place: event.target.value })}
            />
          </AdminField>
        </div>
      </section>

      <section className={base.section}>
        <h2 className={base.legend}>수상명</h2>
        <LocalizedFieldPair
          label="수상명"
          value={form.name}
          onChange={(next) => patch({ name: next })}
          required
          field="name"
          error={issueFor(issues, "name.ko")}
        />
      </section>

      <section className={base.section}>
        <h2 className={base.legend}>설명</h2>
        <LocalizedFieldPair
          label="설명"
          value={form.description}
          onChange={(next) => patch({ description: next })}
          multiline
          rows={4}
        />
      </section>

      <section className={base.section}>
        <label className={base.checkbox}>
          <input
            type="checkbox"
            checked={form.published}
            onChange={(event) => patch({ published: event.target.checked })}
          />
          <span>공개 (방문자에게 표시)</span>
        </label>
      </section>

    </AdminFormShell>
  );
};

export { AwardForm };
