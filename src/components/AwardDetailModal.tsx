"use client";

import { Modal } from "@/components/Modal";

import type { ReactNode } from "react";

import styles from "./AwardDetailModal.module.css";

type Award = {
  year: number | string;
  name: string;
  place?: string;
  description: string;
};

type Props = {
  award: Award | null;
  /** 상단 표시줄에 붙는 구획 이름. */
  label: string;
  closeLabel: string;
  open: boolean;
  onClose: () => void;
  /** 설명 아래에 덧붙일 것. 개발 수상의 프로젝트 링크가 여기로 온다. */
  children?: ReactNode;
};

/** 수상 상세 모달. 음악·개발이 같은 레이아웃을 쓰고 덧붙일 것만 다르다. */
const AwardDetailModal = ({ award, label, closeLabel, open, onClose, children }: Props) => (
  <Modal
    open={open}
    onClose={onClose}
    closeLabel={closeLabel}
    maxWidth={600}
    crumb={award ? `${label} · ${award.year}` : ""}
    label={award ? award.name : ""}
  >
    {award ? (
      <div>
        <div className={styles.year}>{award.year}</div>
        <div className={styles.name}>{award.name}</div>
        {award.place ? <div className={styles.place}>{award.place}</div> : null}
        <p className={styles.description}>{award.description}</p>
        {children}
      </div>
    ) : null}
  </Modal>
);

export { AwardDetailModal };
