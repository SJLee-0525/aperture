"use client";

import { useState } from "react";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";

import { extractYouTubeVideoId } from "@/features/dev-blog/_lib/markdown-directives";

import styles from "./ArticleForm.module.css";

type Props = {
  onInsert: (url: string, title: string, source: string) => void;
  onClose: () => void;
};

/**
 * YouTube 삽입 입력줄 — 주소·제목·출처를 받아 전용 문법을 만든다.
 *
 * 외부 metadata API 로 제목을 자동으로 가져오지 않는다(계획 §4). 제목은 facade 와 iframe 의
 * accessible name 이라 필수이고, 자동 조회는 외부 요청과 실패 처리를 늘리기만 한다.
 * 주소는 여기서 미리 검사해 ID 를 못 뽑으면 삽입을 막는다 — 본문에 넣은 뒤 발행 단계에서
 * 알게 되는 것보다 낫다.
 *
 * @param {Props} props
 * @param {(url: string, title: string, source: string) => void} props.onInsert 검사를 통과한 값을 본문에 넣는다.
 * @param {() => void} props.onClose 입력을 접는다.
 * @returns {JSX.Element}
 */
const ArticleYouTubeDialog = ({ onInsert, onClose }: Props) => {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");

  const videoId = extractYouTubeVideoId(url.trim());
  const canInsert = Boolean(videoId && title.trim());

  return (
    <div className={`${styles.panel} ${styles.section}`}>
      <div className={styles.inlineForm}>
        <AdminField label="영상 주소" className={styles.inlineField}>
          <AdminInput
            value={url}
            placeholder="https://youtu.be/…"
            onChange={(event) => setUrl(event.target.value)}
          />
        </AdminField>
        <AdminField label="영상 제목" className={styles.inlineField}>
          <AdminInput value={title} onChange={(event) => setTitle(event.target.value)} />
        </AdminField>
        <AdminField label="출처 (선택)" className={styles.inlineField}>
          <AdminInput value={source} onChange={(event) => setSource(event.target.value)} />
        </AdminField>
        <AdminButton
          variant="secondary"
          disabled={!canInsert}
          onClick={() => onInsert(url.trim(), title.trim(), source.trim())}
        >
          본문에 넣기
        </AdminButton>
        <AdminButton variant="secondary" onClick={onClose}>
          닫기
        </AdminButton>
      </div>

      {url.trim() && !videoId ? (
        <p className={styles.error} role="alert">
          주소에서 영상 ID를 찾지 못했습니다. youtube.com 또는 youtu.be 주소를 넣으세요.
        </p>
      ) : null}
    </div>
  );
};

export { ArticleYouTubeDialog };
