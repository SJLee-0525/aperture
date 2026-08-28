"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { AdminButton } from "@/components/AdminButton";
import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";
import { ArticleMarkdownHelp } from "@/features/admin-dev-articles/_components/ArticleMarkdownHelp";
import { ArticlePreviewPanel } from "@/features/admin-dev-articles/_components/ArticlePreviewPanel";
import { ArticleYouTubeDialog } from "@/features/admin-dev-articles/_components/ArticleYouTubeDialog";

import {
  imageMarkdown,
  insertAtSelection,
  youtubeMarkdown,
} from "@/features/admin-dev-articles/_lib/markdown-insert";

import type { ArticleBodyUploader } from "@/features/admin-dev-articles/_lib/article-image-uploader";

import styles from "./ArticleBodyEditor.module.css";
import formStyles from "./ArticleForm.module.css";

type Props = {
  value: string;
  upload: ArticleBodyUploader;
  onChange: (next: string) => void;
};

/**
 * 한국어 Markdown 본문 편집기 — 삽입 도구 · 편집/미리보기 토글 · 도움말.
 *
 * 편집과 미리보기를 동시에 렌더하지 않는다(07-dev-blog §3). 넓은 화면에서도 두 패널을 나란히 두면
 * 입력 영역이 절반으로 줄고, 미리보기는 서버 요청이라 보지 않는 동안 계속 부를 이유도 없다.
 *
 * 이미지는 파일 선택 뒤 인라인 입력에서 대체 텍스트를 받아 업로드하고 커서 자리에 삽입한다.
 * 업로더는 주입받으므로 이 컴포넌트는 저장 위치를 모른다.
 *
 * @param props.value 본문 원문.
 * @param props.upload 이미지 업로더.
 * @param props.onChange 본문이 바뀌었을 때.
 */
const ArticleBodyEditor = ({ value, upload, onChange }: Props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 대체 텍스트는 인라인 입력으로 받는다. window.prompt 는 iOS Safari 가 사진 선택기
  // 이후의 change 이벤트에서 표시하지 않아 업로드가 시작조차 되지 않았다.
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingAlt, setPendingAlt] = useState("");

  // 삽입은 업로드가 끝난 뒤에도 일어난다. 그때 `props.value` 는 업로드를 시작하던 시점의
  // 값이라, 그 값으로 본문을 통째로 바꾸면 올리는 동안 입력한 글이 사라진다. textarea 는
  // 업로드 중에도 열려 있으므로 최신 본문을 ref 에 따로 보관한다.
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

    // 본문을 통째로 바꾸면 브라우저가 커서를 끝으로 보내며 스크롤을 맨 아래로 내린다.
    // 삽입 지점 위의 줄은 그대로라 원래 위치를 되돌리면 보던 자리가 유지된다.
    const scrollTop = textarea?.scrollTop ?? 0;

    const next = insertAtSelection(current, selection, snippet);
    onChange(next.value);
    // 삽입한 조각 뒤로 커서를 옮긴다. 값이 반영된 뒤여야 해서 다음 프레임에 미룬다.
    window.requestAnimationFrame(() => {
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(next.selection.start, next.selection.end);
      // focus 도 스크롤을 움직이므로 마지막에 되돌린다.
      textarea.scrollTop = scrollTop;
    });
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setPendingAlt("");
    setPendingImage(file);
  };

  const insertPendingImage = async () => {
    const alt = pendingAlt.trim();
    if (!pendingImage || !alt) return;

    setUploading(true);
    setError(null);
    try {
      const image = await upload(pendingImage);
      // 크기를 함께 적어 두면 공개 지면이 이미지 도착 전에 자리를 잡는다.
      insert(imageMarkdown(image.url, alt, { width: image.w, height: image.h }));
      setPendingImage(null);
      setPendingAlt("");
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
            aria-pressed={pendingImage !== null}
            disabled={uploading || preview || pendingImage !== null}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "올리는 중…" : "이미지"}
          </button>
          <button
            type="button"
            className={styles.tool}
            aria-pressed={youtubeOpen}
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
              // 대체 텍스트를 기다리는 동안은 textarea 를 유지한다. 미리보기로 바꾸면
              // 삽입 시점에 커서 위치를 알 수 없어 본문 끝에 붙는다.
              disabled={pendingImage !== null}
              title={
                pendingImage
                  ? "이미지 대체 텍스트를 입력하거나 취소한 뒤 볼 수 있습니다."
                  : undefined
              }
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

      {pendingImage ? (
        <div className={`${formStyles.panel} ${formStyles.section}`}>
          <div className={formStyles.inlineForm}>
            <AdminField
              label={`대체 텍스트 — ${pendingImage.name}`}
              className={formStyles.inlineField}
            >
              <AdminInput
                value={pendingAlt}
                placeholder="이미지에 무엇이 있는지 적습니다"
                autoFocus
                onChange={(event) => setPendingAlt(event.target.value)}
              />
            </AdminField>
            <AdminButton
              variant="secondary"
              disabled={!pendingAlt.trim() || uploading}
              onClick={insertPendingImage}
            >
              {uploading ? "업로드 중…" : "본문에 넣기"}
            </AdminButton>
            <AdminButton
              variant="secondary"
              disabled={uploading}
              onClick={() => {
                setPendingImage(null);
                setPendingAlt("");
                setError(null);
              }}
            >
              취소
            </AdminButton>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {preview ? (
        <ArticlePreviewPanel markdown={value} />
      ) : (
        <AdminInput
          multiline
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
