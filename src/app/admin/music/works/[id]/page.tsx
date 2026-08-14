"use client";

import { use, useEffect, useState } from "react";

import { WorkForm } from "@/features/admin-music-works/_components/WorkForm";

import { getMusicWorkRepository } from "@/lib/admin/music-work-repository";

import type { MusicWork } from "@/types/music";

import styles from "./page.module.css";

type Status = "loading" | "found" | "missing" | "error";

type Props = { params: Promise<{ id: string }> };

/**
 * 연주 수정 — id 로 로드 후 WorkForm 에 초기값 전달. 없으면 안내 문구.
 *
 * @param {Props} props
 * @param {Promise<{ id: string }>} props.params
 * @returns {JSX.Element | null}
 */
const EditMusicWorkPage = ({ params }: Props) => {
  const { id } = use(params);
  const [work, setWork] = useState<MusicWork | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getMusicWorkRepository()
      .get(id)
      .then((loaded) => {
        if (!alive) return;
        if (loaded) {
          setWork(loaded);
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
  if (status === "missing") return <p className={styles.state}>연주를 찾을 수 없습니다.</p>;
  if (status === "error")
    return (
      <p className={styles.stateError} role="alert">
        {error ?? "연주를 불러오지 못했습니다."}
      </p>
    );

  return work ? <WorkForm workId={id} initial={work} /> : null;
};

export default EditMusicWorkPage;
