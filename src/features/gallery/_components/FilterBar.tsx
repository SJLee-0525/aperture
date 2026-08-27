"use client";

import { useMemo, useRef, useState } from "react";

import { Icon } from "@/components/Icon";
import { RangeSlider } from "@/components/RangeSlider";
import { Select } from "@/components/Select";
import { TagFilterBar } from "@/components/TagFilterBar";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useEscapeKey } from "@/hooks/use-escape-key";

import { pickText } from "@/lib/i18n/pick-text";
import { ALL, FOCAL_MAX, FOCAL_MIN } from "@/lib/photo/filter-query";

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
  /** 슬라이더 조작이 끝났을 때 현재 범위를 전달한다. */
  onFocalCommit?: (low: number, high: number) => void;
  /** pointercancel에서 focal draft를 취소한다. */
  onFocalCancel?: () => void;
  onReset: () => void;
  filtersActive: boolean;
};

/**
 * 태그 칩 + 필터 팝오버(카메라·초점거리·초기화). 카메라·초점거리는 사진 EXIF에서 파생.
 *
 * @param {Props} props
 * @returns {JSX.Element}
 */
const FilterBar = (props: Props) => {
  const { dict, lang } = useLang();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // 슬라이더 드래그마다 이 컴포넌트가 다시 렌더된다 — 칩 목록까지 매번 새로 만들지 않는다.
  const tagItems = useMemo(
    () => props.tags.map((tag) => ({ id: tag.id, label: pickText(tag, lang) })),
    [props.tags, lang],
  );

  useEscapeKey(open, () => {
    setOpen(false);
    triggerRef.current?.focus();
  });

  return (
    <TagFilterBar
      items={tagItems}
      activeId={props.tag === ALL ? null : props.tag}
      allLabel={dict.allTag}
      onSelect={(id) => props.onTag(id ?? ALL)}
      trailing={
        <div className={styles.filters}>
          <button
            ref={triggerRef}
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
                    minLabel={dict.rangeMinLabel.replace("{name}", dict.focalLabel)}
                    maxLabel={dict.rangeMaxLabel.replace("{name}", dict.focalLabel)}
                    onChange={props.onFocal}
                    onChangeEnd={props.onFocalCommit}
                    onChangeCancel={props.onFocalCancel}
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
      }
    />
  );
};

export { FilterBar };
