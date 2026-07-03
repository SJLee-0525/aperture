"use client";

import { use, useEffect, useState } from "react";

import { AwardForm } from "@/features/admin-music-awards/_components/AwardForm";
import { musicAwards } from "@/lib/firebase/music";
import type { MusicAward } from "@/types/music";

import styles from "./page.module.css";

type Status = "loading" | "found" | "missing" | "error";

type Props = { params: Promise<{ id: string }> };

/** 수상 수정 — id 로 로드 후 AwardForm 에 초기값 전달. 없으면 안내 문구. */
const EditMusicAwardPage = ({ params }: Props) => {
  const { id } = use(params);
  const [award, setAward] = useState<MusicAward | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    musicAwards
      .get(id)
      .then((loaded) => {
        if (!alive) return;
        if (loaded) {
          setAward(loaded);
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
  if (status === "missing") return <p className={styles.state}>수상을 찾을 수 없습니다.</p>;
  if (status === "error")
    return (
      <p className={styles.stateError} role="alert">
        {error ?? "수상을 불러오지 못했습니다."}
      </p>
    );

  return award ? <AwardForm awardId={id} initial={award} /> : null;
};

export default EditMusicAwardPage;
