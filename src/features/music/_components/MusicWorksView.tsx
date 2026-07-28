"use client";

import Image from "next/image";

import { Modal } from "@/components/Modal";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useQueryModal } from "@/hooks/use-query-modal";
import { pickText } from "@/lib/i18n/pick-text";
import type { MusicWork } from "@/types/music";

import styles from "./MusicWorksView.module.css";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;

/** 연주 목록 (/music) — 포스터 그리드. 클릭 시 프로그램·예매 모달. */
const MusicWorksView = ({ works }: { works: MusicWork[] }) => {
  const { dict, lang } = useLang();
  const { active: selected, open, select, close } = useQueryModal("work", works);

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{dict.musicWorksNav}</h1>
      {works.length === 0 ? (
        <p className={styles.empty}>{dict.comingSoon}</p>
      ) : (
        <div className={styles.works}>
          {works.map((work) => (
            <button
              type="button"
              key={work.id}
              className={styles.work}
              onClick={() => select(work.id)}
            >
              <div className={styles.poster}>
                {work.poster.url ? (
                  <Image
                    src={work.poster.url}
                    alt={pickText(work.title, lang)}
                    fill
                    sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw"
                    className={styles.posterImg}
                  />
                ) : (
                  "POSTER"
                )}
                <span className={styles.tag}>{pickText(work.category, lang)}</span>
              </div>
              <div className={styles.wt}>{pickText(work.title, lang)}</div>
              <div className={styles.ws}>{pickText(work.subtitle, lang)}</div>
              <div className={styles.wm}>
                {ymd(work.performedAt)} · {pickText(work.venue, lang)}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={close}
        maxWidth={920}
        mobileFull
        crumb={selected ? pickText(selected.category, lang) : ""}
        label={selected ? pickText(selected.title, lang) : ""}
      >
        {selected ? (
          <div className={styles.rec}>
            <div className={styles.recPoster}>
              {selected.poster.url ? (
                <Image
                  src={selected.poster.url}
                  alt={pickText(selected.title, lang)}
                  fill
                  sizes="300px"
                  className={styles.posterImg}
                />
              ) : (
                "POSTER"
              )}
            </div>
            <div>
              <div className={styles.rt}>{pickText(selected.title, lang)}</div>
              <div className={styles.rsub}>{pickText(selected.subtitle, lang)}</div>
              <div className={styles.rmeta}>
                {ymd(selected.performedAt)} · {selected.time}
              </div>
              <div className={styles.rv}>{pickText(selected.venue, lang)}</div>
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
