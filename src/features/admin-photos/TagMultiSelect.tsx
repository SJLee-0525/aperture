"use client";

import { useEffect, useState } from "react";

import { Chip } from "@/components/Chip";
import { getTags } from "@/lib/content/get-tags";
import type { Tag } from "@/types/tag";

import styles from "./TagMultiSelect.module.css";

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
};

/** 태그 사전(getTags)을 칩으로 토글 — 선택된 id[] 를 상위 폼에 반영. 라벨은 ko. */
const TagMultiSelect = ({ selected, onChange }: Props) => {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    let alive = true;
    getTags().then((loaded) => {
      if (alive) setTags(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id]);
  };

  if (tags.length === 0) {
    return <p className={styles.empty}>태그 사전이 비어 있습니다.</p>;
  }

  return (
    <div className={styles.chips}>
      {tags.map((tag) => (
        <Chip
          key={tag.id}
          label={tag.ko}
          active={selected.includes(tag.id)}
          onClick={() => toggle(tag.id)}
        />
      ))}
    </div>
  );
};

export { TagMultiSelect };
