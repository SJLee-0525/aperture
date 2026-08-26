"use client";

import Image from "next/image";

import { Modal } from "@/components/Modal";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useMusicWorkTools } from "@/features/music/_hooks/use-music-tools";
import { useQueryModal } from "@/hooks/use-query-modal";
import { useRegisterChatScreenTarget } from "@/hooks/use-register-chat-screen-target";

import { formatEventYMD } from "@/lib/format/format-date";
import { pickText } from "@/lib/i18n/pick-text";

import { imagePreviewUrl } from "@/types/image";

import type { MusicWork } from "@/types/music";

import styles from "./MusicWorksView.module.css";

/** 가장 좁은 화면의 첫 행 포스터 수. 560px 이하가 1열이라 더 주면 화면 밖 이미지를 preload 한다. */
const FIRST_ROW_POSTERS = 1;

/**
 * 프로그램 곡 순번 2자리 표기 (01, 02, …)
 *
 * @param {number} n
 * @returns {string}
 */
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 연주 목록 (/music) — 포스터 그리드. 클릭 시 프로그램·예매 모달.
 *
 * @param {{ works: MusicWork[] }} props
 * @param {MusicWork[]} props.works
 * @returns {JSX.Element}
 */
const MusicWorksView = ({ works }: { works: MusicWork[] }) => {
  const { dict, lang } = useLang();
  const { active: selected, open, select, close } = useQueryModal("work", works);
  // WebMCP 도구 — 미지원 브라우저에선 no-op(어댑터 기능 감지).
  useMusicWorkTools(works);
  // 선택한 연주 제목을 챗봇 입력창에 표시한다.
  useRegisterChatScreenTarget(
    selected ? { type: "work", id: selected.id, label: pickText(selected.title, lang) } : null,
  );

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{dict.musicWorksNav}</h1>
      {works.length === 0 ? (
        <p className={styles.empty}>{dict.comingSoon}</p>
      ) : (
        <div className={styles.works}>
          {works.map((work, index) => (
            <button
              type="button"
              key={work.id}
              className={styles.work}
              data-cursor-large="frame"
              onClick={() => select(work.id)}
            >
              <div className={styles.poster} data-protected-image>
                {imagePreviewUrl(work.poster) ? (
                  <Image
                    src={imagePreviewUrl(work.poster)}
                    alt={pickText(work.title, lang)}
                    fill
                    sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw"
                    className={styles.posterImg}
                    draggable={false}
                    priority={index < FIRST_ROW_POSTERS}
                  />
                ) : (
                  "POSTER"
                )}
                <span className={styles.tag}>{pickText(work.category, lang)}</span>
              </div>
              <div className={styles.workBody}>
                <div className={styles.wt}>{pickText(work.title, lang)}</div>
                <div className={styles.ws}>{pickText(work.subtitle, lang)}</div>
                <div className={styles.wm}>
                  {formatEventYMD(work.performedAt)} · {pickText(work.venue, lang)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={close}
        closeLabel={dict.closeLabel}
        maxWidth={920}
        mobileFull
        crumb={selected ? pickText(selected.category, lang) : ""}
        label={selected ? pickText(selected.title, lang) : ""}
        shareTitle={selected ? pickText(selected.title, lang) : undefined}
        shareLabel={dict.shareLabel}
      >
        {selected ? (
          <div className={styles.rec}>
            <div className={styles.recPoster} data-protected-image>
              {selected.poster.url ? (
                <Image
                  src={selected.poster.url}
                  alt={pickText(selected.title, lang)}
                  fill
                  sizes="300px"
                  className={styles.posterImg}
                  draggable={false}
                />
              ) : (
                "POSTER"
              )}
            </div>
            <div>
              <div className={styles.rt}>{pickText(selected.title, lang)}</div>
              <div className={styles.rsub}>{pickText(selected.subtitle, lang)}</div>
              <div className={styles.rmeta}>
                {formatEventYMD(selected.performedAt)} · {selected.time}
              </div>
              <div className={styles.rv}>{pickText(selected.venue, lang)}</div>
              {selected.ticketUrl.trim() ? (
                <div className={styles.rbtns}>
                  <a
                    className={styles.book}
                    href={selected.ticketUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {dict.musicBook}
                  </a>
                </div>
              ) : null}
              <div className={styles.prog}>
                <div className={styles.ph}>{dict.musicProgram}</div>
                {selected.program.map((piece, i) => (
                  <div key={piece} className={styles.pr}>
                    <span className={styles.pn}>{pad(i + 1)}</span>
                    <span className={styles.pt}>{piece}</span>
                  </div>
                ))}
              </div>
              <p className={styles.rdesc}>{pickText(selected.description, lang)}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </main>
  );
};

export { MusicWorksView };
