"use client";

import { use, useEffect, useState } from "react";

import { PhotoForm } from "@/features/admin-photos/_components/PhotoForm";

import { getPhotoRepository } from "@/lib/admin/photo-repository";

import type { Photo } from "@/types/photo";

import styles from "./page.module.css";

type Status = "loading" | "found" | "missing" | "error";

type Props = { params: Promise<{ id: string }> };

const EditPhotoPage = ({ params }: Props) => {
  const { id } = use(params);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getPhotoRepository()
      .get(id)
      .then((loaded) => {
        if (!alive) return;
        if (loaded) {
          setPhoto(loaded);
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
  if (status === "missing") return <p className={styles.state}>사진을 찾을 수 없습니다.</p>;
  if (status === "error")
    return (
      <p className={styles.stateError} role="alert">
        {error ?? "사진을 불러오지 못했습니다."}
      </p>
    );

  return photo ? <PhotoForm photoId={id} initial={photo} /> : null;
};

export default EditPhotoPage;
