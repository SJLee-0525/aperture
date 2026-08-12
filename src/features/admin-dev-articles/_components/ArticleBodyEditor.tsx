"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { ArticleMarkdownHelp } from "@/features/admin-dev-articles/_components/ArticleMarkdownHelp";
import { ArticlePreviewPanel } from "@/features/admin-dev-articles/_components/ArticlePreviewPanel";
import { ArticleYouTubeDialog } from "@/features/admin-dev-articles/_components/ArticleYouTubeDialog";
import {
  imageMarkdown,
  insertAtSelection,
  youtubeMarkdown,
} from "@/features/admin-dev-articles/_lib/markdown-insert";
import type { ArticleImageUploader } from "@/features/admin-dev-articles/_lib/mock-article-uploader";

import styles from "./ArticleBodyEditor.module.css";

type Props = {
  value: string;
  upload: ArticleImageUploader;
  onChange: (next: string) => void;
};

/**
 * 한국어 Markdown 본문 편집기 — 삽입 도구 · 편집/미리보기 토글 · 도움말.
 *
 * 편집과 미리보기를 동시에 렌더하지 않는다(계획 §3). 넓은 화면에서도 두 패널을 나란히 두면
 * 입력 영역이 절반으로 줄고, 미리보기는 서버 요청이라 보지 않는 동안 계속 부를 이유도 없다.
 *
 * 이미지는 업로드가 끝난 뒤 커서 자리에 대체 텍스트를 포함한 문법으로 들어간다(계획 §4).
 * 업로더는 주입받는다 — mock 단계에서는 fixture 주소를, B5 에서는 Storage 업로드를 준다.
 *
 * @param {Props} props
 * @param {string} props.value 본문 원문.
 * @param {ArticleImageUploader} props.upload 이미지 업로더.
 * @param {(next: string) => void} props.onChange 본문이 바뀌었을 때.
 * @returns {JSX.Element}
 */
const ArticleBodyEditor = ({ value, upload, onChange }: Props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 삽입은 업로드가 끝난 뒤에도 일어난다. 그때 `props.value` 는 업로드를 시작하던 시점의
  // 값이라, 그 값으로 본문을 통째로 바꾸면 올리는 동안 입력한 글이 사라진다. textarea 는
  // 업로드 중에도 열려 있으므로 최신 본문을 따로 붙들어 둔다.
  const latestValue = useRef(value);
  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  const insert = (snippet: string) => {
    const textarea = textareaRef.current;
    const current = latestValue.current;
    const selection = textarea
      ? { start: textarea.selectionStart, end: textarea.selectionEnd }
      : { start: current.length, end: current.length };

    const next = insertAtSelection(current, selection, snippet);
    onChange(next.value);
    // 삽입한 조각 뒤로 커서를 옮긴다. 값이 반영된 뒤여야 해서 다음 프레임에 미룬다.
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(next.selection.start, next.selection.end);
    });
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const alt = window.prompt("이미지 대체 텍스트를 입력하세요. 이미지에 무엇이 있는지 적습니다.");
    if (alt === null) return;
    if (!alt.trim()) {
      setError("대체 텍스트 없이는 이미지를 넣을 수 없습니다.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const image = await upload(file);
      insert(imageMarkdown(image.url, alt.trim()));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className={styles.editor}>
      <header className={styles.head}>
        <h2 className={styles.legend}>본문 (한국어 원문)</h2>

        <div className={styles.tools}>
          <button
            type="button"
            className={styles.tool}
            disabled={uploading || preview}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "올리는 중…" : "이미지"}
          </button>
          <button
            type="button"
            className={styles.tool}
            disabled={preview}
            onClick={() => setYoutubeOpen((open) => !open)}
          >
            YouTube
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFileChange} />

          <div className={styles.tabs} role="group" aria-label="편집 · 미리보기">
            <button
              type="button"
              className={styles.tab}
              aria-pressed={!preview}
              onClick={() => setPreview(false)}
            >
              편집
            </button>
            <button
              type="button"
              className={styles.tab}
              aria-pressed={preview}
              onClick={() => setPreview(true)}
            >
              미리보기
            </button>
          </div>
        </div>
      </header>

      {youtubeOpen && !preview ? (
        <ArticleYouTubeDialog
          onInsert={(url, title, source) => {
            insert(youtubeMarkdown(url, title, source || undefined));
            setYoutubeOpen(false);
          }}
          onClose={() => setYoutubeOpen(false)}
        />
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {preview ? (
        <ArticlePreviewPanel markdown={value} />
      ) : (
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={value}
          lang="ko"
          spellCheck={false}
          aria-label="본문 Markdown"
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      <ArticleMarkdownHelp />
    </section>
  );
};

export { ArticleBodyEditor };
