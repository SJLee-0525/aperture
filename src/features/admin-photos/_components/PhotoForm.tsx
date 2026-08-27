"use client";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";
import { LocalizedFieldPair } from "@/components/LocalizedFieldPair";
import base from "@/features/admin-shell/_components/admin-form.module.css";

import { usePhotoEditor } from "@/features/admin-photos/_hooks/use-photo-editor";

import { fromDatetimeLocal, toDatetimeLocal } from "@/features/admin-photos/_lib/datetime-local";

import type { Photo } from "@/types/photo";

import styles from "./PhotoForm.module.css";
import { PhotoUploadField } from "./PhotoUploadField";
import { PlaceField } from "./PlaceField";
import { TagMultiSelect } from "./TagMultiSelect";

type Props = {
  photoId: string;
  /** 있으면 수정 모드. */
  initial?: Photo;
};

/** EXIF 8개 필드의 라벨(관리자 전용 → 한국어 고정). */
const EXIF_FIELDS: { key: keyof Photo["exif"]; label: string; placeholder: string }[] = [
  { key: "aperture", label: "조리개", placeholder: "f/2.8" },
  { key: "shutter", label: "셔터", placeholder: "1/500" },
  { key: "iso", label: "ISO", placeholder: "100" },
  { key: "focalLength", label: "초점거리", placeholder: "35 mm" },
  { key: "ev", label: "노출 보정", placeholder: "−0.3 EV" },
  { key: "wb", label: "화이트밸런스", placeholder: "5600 K" },
  { key: "metering", label: "측광", placeholder: "Multi" },
  { key: "flash", label: "플래시", placeholder: "발광 안 함" },
];

/**
 * 공유 사진 폼 — 업로드(EXIF 자동 채움) + 이중언어·EXIF·좌표·태그 편집 + 저장.
 *
 * @param {Props} props
 * @param {string} props.photoId
 * @param {Photo | undefined} props.initial - 있으면 수정 모드.
 * @returns {JSX.Element}
 */
const PhotoForm = ({ photoId, initial }: Props) => {
  const {
    cancel,
    clearCoords,
    coordsFromExif,
    error,
    form,
    isEdit,
    lat,
    lng,
    onUploaded,
    onUploadPendingChange,
    patch,
    patchExif,
    saving,
    uploading,
    setLat,
    setLng,
    submit,
  } = usePhotoEditor(photoId, initial);

  return (
    <form className={base.form} onSubmit={submit} noValidate>
      <header className={base.head}>
        <h1 className={base.title}>{isEdit ? "사진 수정" : "새 사진"}</h1>
      </header>

      <section className={base.section}>
        <h2 className={base.legend}>이미지</h2>
        <PhotoUploadField
          photoId={photoId}
          image={form.image.url ? form.image : null}
          onUploaded={onUploaded}
          onPendingChange={onUploadPendingChange}
        />
      </section>

      <section className={base.section}>
        <h2 className={base.legend}>제목</h2>
        <LocalizedFieldPair
          label="제목"
          value={form.title}
          onChange={(next) => patch({ title: next })}
          required
        />
      </section>

      <section className={base.section}>
        <h2 className={base.legend}>장비 · 촬영</h2>
        <div className={base.grid2}>
          <AdminField label="카메라">
            <AdminInput value={form.camera} onChange={(e) => patch({ camera: e.target.value })} />
          </AdminField>
          <AdminField label="렌즈">
            <AdminInput value={form.lens} onChange={(e) => patch({ lens: e.target.value })} />
          </AdminField>
          <AdminField label="촬영일시">
            <AdminInput
              type="datetime-local"
              value={toDatetimeLocal(form.shotAt)}
              onChange={(e) => patch({ shotAt: fromDatetimeLocal(e.target.value) })}
            />
          </AdminField>
        </div>
      </section>

      <section className={base.section}>
        <h2 className={base.legend}>EXIF</h2>
        <div className={styles.grid3}>
          {EXIF_FIELDS.map(({ key, label, placeholder }) => (
            <AdminField key={key} label={label}>
              <AdminInput
                value={form.exif[key]}
                placeholder={placeholder}
                onChange={(e) => patchExif(key, e.target.value)}
              />
            </AdminField>
          ))}
        </div>
      </section>

      <section className={base.section}>
        <h2 className={base.legend}>장소 · 좌표</h2>
        <PlaceField
          place={form.place}
          latStr={lat}
          lngStr={lng}
          fromExif={coordsFromExif}
          onClearCoords={clearCoords}
          onPlaceChange={(place) => patch({ place })}
          onLatChange={setLat}
          onLngChange={setLng}
          onPickResult={(place, plat, plng) => {
            patch({ place });
            setLat(String(plat));
            setLng(String(plng));
          }}
        />
      </section>

      <section className={base.section}>
        <h2 className={base.legend}>태그</h2>
        <TagMultiSelect selected={form.tags} onChange={(tags) => patch({ tags })} />
      </section>

      <section className={base.section}>
        <label className={base.checkbox}>
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => patch({ published: e.target.checked })}
          />
          <span>공개 (방문자에게 표시)</span>
        </label>
      </section>

      {error ? (
        <p className={base.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={base.actions}>
        <AdminButton variant="primary" type="submit" disabled={saving || uploading}>
          {saving ? "저장 중…" : "저장"}
        </AdminButton>
        <AdminButton variant="secondary" onClick={cancel} disabled={saving || uploading}>
          취소
        </AdminButton>
      </div>
    </form>
  );
};

export { PhotoForm };
