"use client";

import { use, useEffect, useState } from "react";

import { MediaForm } from "@/features/admin-music-media/_components/MediaForm";
import { musicMedia } from "@/lib/firebase/music";
import type { MusicMedia } from "@/types/music";

import styles from "./page.module.css";

type Status = "loading" | "found" | "missing" | "error";

type Props = { params: Promise<{ id: string }> };

/**
 * 영상 수정 — id 로 로드 후 MediaForm 에 초기값 전달. 없으면 안내 문구.
 *
 * @param {Props} props
 * @param {Promise<{ id: string }>} props.params
 * @returns {JSX.Element | null}
 */
const EditMusicMediaPage = ({ params }: Props) => {
  const { id } = use(params);
  const [media, setMedia] = useState<MusicMedia | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    musicMedia
      .get(id)
      .then((loaded) => {
        if (!alive) return;
        if (loaded) {
          setMedia(loaded);
          setStatus("found");
        } else {
          setStatus("missing");
        }
      })
      .catch((caught: Error) => {
        if (!alive) return;
        setError(caught.message);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (status === "loading") return <p className={styles.state}>불러오는 중…</p>;
  if (status === "missing") return <p className={styles.state}>영상을 찾을 수 없습니다.</p>;
  if (status === "error")
    return (
      <p className={styles.stateError} role="alert">
        {error ?? "영상을 불러오지 못했습니다."}
      </p>
    );

  return media ? <MediaForm mediaId={id} initial={media} /> : null;
};

export default EditMusicMediaPage;
