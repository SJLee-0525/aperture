"use client";

import { useEffect, useState } from "react";

type AdminDocStatus = "loading" | "found" | "missing" | "error";

type DocReader<T> = { get: (id: string) => Promise<T | null> };

/**
 * 수정 화면이 문서 하나를 불러오는 공통 상태.
 *
 * `alive` 로 언마운트 이후의 setState 를 막는다. 관리자는 목록과 수정 화면을 빠르게 오가고,
 * 그 사이 도착한 응답이 사라진 화면의 상태를 건드리면 경고가 남는다.
 *
 * @param getRepository 저장소 getter. 렌더마다 새 객체를 만들지 않도록 memoized getter 를 넘긴다.
 * @param id 문서 ID.
 */
const useAdminDocLoad = <T>(getRepository: () => DocReader<T>, id: string) => {
  const [doc, setDoc] = useState<T | null>(null);
  const [status, setStatus] = useState<AdminDocStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getRepository()
      .get(id)
      .then((loaded) => {
        if (!alive) return;
        setDoc(loaded);
        setStatus(loaded ? "found" : "missing");
      })
      .catch((caught: Error) => {
        if (!alive) return;
        setError(caught.message);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
    // getRepository 는 모듈 수준 getter 라 참조가 고정이다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { doc, status, error };
};

export { useAdminDocLoad };
