"use client";

import { useAdminDocLoad } from "@/hooks/use-admin-doc-load";

import { objectParticle } from "@/lib/i18n/korean-particle";

import type { ReactNode } from "react";

import styles from "./admin-doc-state.module.css";

type Props<T> = {
  /** 저장소 getter. 렌더마다 새 객체를 만들지 않도록 모듈 수준 getter 를 넘긴다. */
  getRepository: () => { get: (id: string) => Promise<T | null> };
  id: string;
  /** "연주" 처럼 화면이 다루는 대상. 세 문구가 이것으로 만들어진다. */
  noun: string;
  children: (doc: T) => ReactNode;
};

/**
 * 수정 화면의 문서 로딩과 로딩·없음·오류 3분기.
 *
 * 불러오기와 분기를 나누면 `status`·`error`·`doc` 세 값을 잇는 배관이 일곱 라우트에
 * 반복되고, 게이트가 문서를 받지 않아 호출부마다 `{doc ? … : null}` 삼항이 남는다.
 * 두 모듈의 소비처가 언제나 같은 일곱 페이지라 나눌 이유가 없다.
 *
 * children 은 문서를 찾은 뒤에만 불린다. 폼이 초기값을 필수로 받기 때문이다.
 */
const AdminDocGate = <T,>({ getRepository, id, noun, children }: Props<T>) => {
  const { doc, status, error } = useAdminDocLoad<T>(getRepository, id);
  const particle = objectParticle(noun);

  if (status === "loading") return <p className={styles.state}>불러오는 중…</p>;
  if (status === "missing") {
    return <p className={styles.state}>{`${noun}${particle} 찾을 수 없습니다.`}</p>;
  }
  if (status === "error") {
    return (
      <p className={styles.stateError} role="alert">
        {/* 빈 문구를 그대로 쓰면 alert 가 빈 채로 읽힌다. `??` 는 빈 문자열을 막지 못한다. */}
        {error?.trim() ? error : `${noun}${particle} 불러오지 못했습니다.`}
      </p>
    );
  }
  return <>{doc ? children(doc) : null}</>;
};

export { AdminDocGate };
