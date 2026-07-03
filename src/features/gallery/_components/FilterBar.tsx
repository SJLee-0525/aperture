"use client";

import { useState } from "react";

import { Chip } from "@/components/Chip";
import { Icon } from "@/components/Icon";
import { RangeSlider } from "@/components/RangeSlider";
import { Select } from "@/components/Select";
import { ALL, FOCAL_MAX, FOCAL_MIN } from "@/features/gallery/_lib/filter-photos";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { Tag } from "@/types/tag";

import styles from "./FilterBar.module.css";

type Props = {
  tags: Tag[];
  cameras: string[];
  tag: string;
  onTag: (tag: string) => void;
  camera: string;
  onCamera: (camera: string) => void;
  focalMin: number;
  focalMax: number;
  onFocal: (low: number, high: number) => void;
  onReset: () => void;
  filtersActive: boolean;
};

/** 태그 칩 + 필터 팝오버(카메라·초점거리·초기화). 카메라·초점거리는 사진 EXIF에서 파생. */
const FilterBar = (props: Props) => {
  const { dict, lang } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.bar}>
      <div className={styles.tagbar}>
        <Chip label={dict.allTag} active={props.tag === ALL} onClick={() => props.onTag(ALL)} />
        {props.tags.map((tag) => (
          <Chip
            key={tag.id}
            label={pickText(tag, lang)}
            active={props.tag === tag.id}
            onClick={() => props.onTag(tag.id)}
          />
        ))}
      </div>

      <div className={styles.filters}>
        <button
          type="button"
          className={styles.filterBtn}
          aria-label={dict.filterLabel}
          aria-expanded={open}
          onClick={() => setOpen((isOpen) => !isOpen)}
        >
          <Icon name="funnel" size={16} />
          {props.filtersActive ? <span className={styles.badge} /> : null}
        </button>

        {open ? (
          <>
            <button
              type="button"
              className={styles.backdrop}
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setOpen(false)}
            />
            <div className={styles.pop}>
              <div className={styles.row}>
                <span className="u-label">{dict.cameraLabel}</span>
                <Select
                  ariaLabel={dict.cameraLabel}
                  value={props.camera}
                  onChange={props.onCamera}
                  options={[
                    { value: ALL, label: dict.allTag },
                    ...props.cameras.map((camera) => ({ value: camera, label: camera })),
                  ]}
                />
              </div>

              <div className={styles.row}>
                <span className="u-label">{dict.focalLabel}</span>
                <RangeSlider
                  min={FOCAL_MIN}
                  max={FOCAL_MAX}
                  low={props.focalMin}
                  high={props.focalMax}
                  unit="mm"
                  onChange={props.onFocal}
                />
              </div>

              <div className={styles.foot}>
                <button type="button" className={styles.reset} onClick={props.onReset}>
                  {dict.resetLabel}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export { FilterBar };
