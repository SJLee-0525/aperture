"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";
import { preloadPhotoModal } from "@/features/photo-detail/_components/OnDemandPhotoModal";

import { useLang } from "@/features/lang/_hooks/use-lang";

import { formatCoords } from "@/lib/format/format-coords";
import { pickText } from "@/lib/i18n/pick-text";

import type { MapLocation } from "@/features/map/_types/map-location";

import styles from "./LocationList.module.css";

type Props = {
  locations: MapLocation[];
};

/**
 * 촬영 위치 리스트 — 스크롤 컨테이너 근처에 들어온 48px 썸네일만 마운트한다.
 *
 * @param {Props} props
 * @param {MapLocation[]} props.locations
 * @returns {JSX.Element}
 */
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
    <aside
      id="map-location-scroll-container"
      ref={listRef}
      className={styles.list}
      data-accent-scrollbar
      data-custom-scroll-container
      data-custom-scroll-scope="local"
    >
      <div className={styles.head}>
        <span className="u-label">{dict.locationsLabel}</span>
        <span className={styles.count}>{locations.length} spots</span>
      </div>
      {locations.map((location) => (
        <LocalizedLink
          key={location.id}
          href={{ query: { photo: location.id } }}
          prefetch={false}
          scroll={false}
          className={styles.item}
          onPointerEnter={preloadPhotoModal}
          onPointerDown={preloadPhotoModal}
          onFocus={preloadPhotoModal}
        >
          <span className={styles.thumb} data-thumbnail-id={location.id} data-protected-image>
            {visibleIds.has(location.id) ? (
              <Image
                src={location.thumbnailUrl}
                alt={pickText(location.place, lang)}
                fill
                sizes="46px"
                className={styles.thumbImg}
                draggable={false}
              />
            ) : null}
          </span>
          <span className={styles.txt}>
            <span className={styles.place}>{pickText(location.place, lang)}</span>
            <span className={styles.co}>{formatCoords(location.coords)}</span>
          </span>
        </LocalizedLink>
      ))}
    </aside>
  );
};

export { LocationList };
