"use client";

import { use, useEffect, useState } from "react";

import { AlbumForm } from "@/features/admin-albums/AlbumForm";
import { getAlbumAdmin } from "@/lib/firebase/albums";
import type { Album } from "@/types/album";

import styles from "./page.module.css";

type Status = "loading" | "found" | "missing" | "error";

type Props = { params: Promise<{ id: string }> };

/** 앨범 수정 — id 로 로드 후 AlbumForm 에 초기값 전달. 없으면 안내 문구. */
const EditAlbumPage = ({ params }: Props) => {
  const { id } = use(params);
  const [album, setAlbum] = useState<Album | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getAlbumAdmin(id)
      .then((loaded) => {
        if (!alive) return;
        if (loaded) {
          setAlbum(loaded);
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
  if (status === "missing") return <p className={styles.state}>앨범을 찾을 수 없습니다.</p>;
  if (status === "error")
    return (
      <p className={styles.stateError} role="alert">
        {error ?? "앨범을 불러오지 못했습니다."}
      </p>
    );

  return album ? <AlbumForm albumId={id} initial={album} /> : null;
};

export default EditAlbumPage;
