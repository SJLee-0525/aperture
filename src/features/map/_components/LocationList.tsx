"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useLang } from "@/features/lang/_hooks/use-lang";
import type { MapLocation } from "@/features/map/_types/map-location";
import { formatCoords } from "@/lib/format/format-coords";
import { pickText } from "@/lib/i18n/pick-text";

import styles from "./LocationList.module.css";

type Props = {
  locations: MapLocation[];
};

/** 촬영 위치 리스트 — 스크롤 컨테이너 근처에 들어온 48px 썸네일만 마운트한다. */
const LocationList = ({ locations }: Props) => {
  const { dict, lang } = useLang();
  const listRef = useRef<HTMLElement>(null);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entered = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => (entry.target as HTMLElement).dataset.thumbnailId)
          .filter((id): id is string => id != null);
        if (entered.length === 0) return;

        setVisibleIds((current) => {
          const next = new Set(current);
          for (const id of entered) next.add(id);
          return next;
        });
        for (const entry of entries) {
          if (entry.isIntersecting) observer.unobserve(entry.target);
        }
      },
      { root, rootMargin: "240px 0px" },
    );

    root
      .querySelectorAll<HTMLElement>("[data-thumbnail-id]")
      .forEach((thumbnail) => observer.observe(thumbnail));
    return () => observer.disconnect();
  }, [locations]);

  return (
    <aside ref={listRef} className={styles.list}>
      <div className={styles.head}>
        <span className="u-label">{dict.locationsLabel}</span>
        <span className={styles.count}>{locations.length} spots</span>
      </div>
      {locations.map((location) => (
        <Link
          key={location.id}
          href={{ query: { photo: location.id } }}
          prefetch={false}
          scroll={false}
          className={styles.item}
        >
          <span className={styles.thumb} data-thumbnail-id={location.id}>
            {visibleIds.has(location.id) ? (
              <Image
                src={location.thumbnailUrl}
                alt={pickText(location.place, lang)}
                fill
                sizes="46px"
                className={styles.thumbImg}
              />
            ) : null}
          </span>
          <span className={styles.txt}>
            <span className={styles.place}>{pickText(location.place, lang)}</span>
            <span className={styles.co}>{formatCoords(location.coords)}</span>
          </span>
        </Link>
      ))}
    </aside>
  );
};

export { LocationList };
