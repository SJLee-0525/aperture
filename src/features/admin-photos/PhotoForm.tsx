"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ROUTES } from "@/constants/routes";
import type { UploadResult } from "@/features/image-upload/use-image-upload";
import { createPhoto, updatePhoto, type PhotoInput } from "@/lib/firebase/firestore";
import type { Coords } from "@/types/coords";
import type { Photo } from "@/types/photo";

import { fromDatetimeLocal, toDatetimeLocal } from "./datetime-local";
import { PhotoUploadField } from "./PhotoUploadField";
import { PlaceField } from "./PlaceField";
import styles from "./PhotoForm.module.css";
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

/** Photo → 편집용 초기 상태(PhotoInput 형태). initial 없으면 빈 사진. */
const emptyInput = (): PhotoInput => ({
  title: { ko: "", en: "" },
  shotAt: new Date(),
  camera: "",
  lens: "",
  exif: {
    aperture: "",
    shutter: "",
    iso: "",
    focalLength: "",
    ev: "",
    wb: "",
    metering: "",
    flash: "",
  },
  fileName: undefined,
  dimensions: { w: 0, h: 0 },
  aspectRatio: 1,
  place: { ko: "", en: "" },
  coords: null,
  tags: [],
  image: { url: "", path: "", w: 0, h: 0 },
  // 새 사진은 order 0 — 목록 상단에 오며, dnd 정렬로 조정한다(Date.now 미사용).
  order: 0,
  published: false,
});

const fromPhoto = (photo: Photo): PhotoInput => {
  // id·likes 제외한 나머지를 그대로 편집 상태로.
  const { id: _id, likes: _likes, ...rest } = photo;
  void _id;
  void _likes;
  return rest;
};

/** 공유 사진 폼 — 업로드(EXIF 자동 채움) + 이중언어·EXIF·좌표·태그 편집 + 저장. */
const PhotoForm = ({ photoId, initial }: Props) => {
  const router = useRouter();
  const isEdit = initial != null;

  const [form, setForm] = useState<PhotoInput>(() => (initial ? fromPhoto(initial) : emptyInput()));
  // 좌표는 빈 문자열 허용을 위해 별도 문자열 상태로 관리 → 저장 시 number|null 로 변환.
  const [lat, setLat] = useState(() => (initial?.coords ? String(initial.coords.lat) : ""));
  const [lng, setLng] = useState(() => (initial?.coords ? String(initial.coords.lng) : ""));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const patch = (next: Partial<PhotoInput>) => setForm((prev) => ({ ...prev, ...next }));
  const patchExif = (key: keyof Photo["exif"], value: string) =>
    setForm((prev) => ({ ...prev, exif: { ...prev.exif, [key]: value } }));

  /** 업로드 성공 → image·dimensions·EXIF·shotAt·coords 자동 채움. */
  const onUploaded = (result: UploadResult) => {
    const { exif } = result;
    setForm((prev) => ({
      ...prev,
      image: result.image,
      dimensions: result.dimensions,
      aspectRatio: result.aspectRatio,
      camera: exif.camera,
      lens: exif.lens,
      fileName: exif.fileName,
      exif: {
        aperture: exif.aperture,
        shutter: exif.shutter,
        iso: exif.iso,
        focalLength: exif.focalLength,
        ev: exif.ev,
        wb: exif.wb,
        metering: exif.metering,
        flash: exif.flash,
      },
      shotAt: exif.shotAt ?? prev.shotAt,
      coords: exif.coords ?? prev.coords,
    }));
    if (exif.coords) {
      setLat(String(exif.coords.lat));
      setLng(String(exif.coords.lng));
    }
  };

  /** lat/lng 문자열 → Coords|null (둘 다 유효 숫자일 때만 좌표). */
  const resolveCoords = (): Coords | null => {
    if (lat.trim() === "" || lng.trim() === "") return null;
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (Number.isNaN(nLat) || Number.isNaN(nLng)) return null;
    return { lat: nLat, lng: nLng };
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.title.ko.trim()) {
      setError("제목(한국어)을 입력하세요.");
      return;
    }
    if (!form.image.url) {
      setError("이미지를 먼저 업로드하세요.");
      return;
    }

    const input: PhotoInput = { ...form, coords: resolveCoords() };

    setSaving(true);
    try {
      if (isEdit) {
        await updatePhoto(photoId, input);
      } else {
        await createPhoto(photoId, input);
      }
      router.replace(ROUTES.ADMIN_PHOTOS);
    } catch (caught) {
      setError((caught as Error).message);
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <header className={styles.head}>
        <h1 className={styles.title}>{isEdit ? "사진 수정" : "새 사진"}</h1>
      </header>

      <section className={styles.section}>
        <h2 className={styles.legend}>이미지</h2>
        <PhotoUploadField
          photoId={photoId}
          image={form.image.url ? form.image : null}
          onUploaded={onUploaded}
        />
      </section>

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
        <h2 className={styles.legend}>장비 · 촬영</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>카메라</span>
            <input
              className={styles.input}
              value={form.camera}
              onChange={(e) => patch({ camera: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>렌즈</span>
            <input
              className={styles.input}
              value={form.lens}
              onChange={(e) => patch({ lens: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>촬영일시</span>
            <input
              className={styles.input}
              type="datetime-local"
              value={toDatetimeLocal(form.shotAt)}
              onChange={(e) => patch({ shotAt: fromDatetimeLocal(e.target.value) })}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>EXIF</h2>
        <div className={styles.grid3}>
          {EXIF_FIELDS.map(({ key, label, placeholder }) => (
            <label key={key} className={styles.field}>
              <span className={styles.label}>{label}</span>
              <input
                className={styles.input}
                value={form.exif[key]}
                placeholder={placeholder}
                onChange={(e) => patchExif(key, e.target.value)}
              />
            </label>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.legend}>장소 · 좌표</h2>
        <PlaceField
          place={form.place}
          latStr={lat}
          lngStr={lng}
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

      <section className={styles.section}>
        <h2 className={styles.legend}>태그</h2>
        <TagMultiSelect selected={form.tags} onChange={(tags) => patch({ tags })} />
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
          {saving ? "저장 중…" : isEdit ? "수정 저장" : "사진 저장"}
        </button>
        <button
          type="button"
          className={styles.cancel}
          onClick={() => router.replace(ROUTES.ADMIN_PHOTOS)}
          disabled={saving}
        >
          취소
        </button>
      </div>
    </form>
  );
};

export { PhotoForm };
