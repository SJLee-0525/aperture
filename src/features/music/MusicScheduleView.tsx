"use client";

import { useLang } from "@/features/lang/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { MusicSchedule } from "@/types/music";

import styles from "./MusicScheduleView.module.css";

const pad = (n: number) => String(n).padStart(2, "0");
const md = (d: Date) => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;

/** 공연 일정 (/music/schedule) — 상태 배지(예매 중 / 오픈 예정). */
const MusicScheduleView = ({ schedule }: { schedule: MusicSchedule[] }) => {
  const { dict, lang } = useLang();

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{dict.musicScheduleNav}</h1>
      {schedule.length === 0 ? (
        <p className={styles.empty}>{dict.comingSoon}</p>
      ) : (
        <div className={styles.sch}>
          {schedule.map((item) => (
            <div key={item.id} className={styles.row}>
              <div className={styles.dt}>
                {md(item.date)} <span className={styles.y}>{item.date.getFullYear()}</span>
              </div>
              <div>
                <div className={styles.tt}>{pickText(item.title, lang)}</div>
                <div className={styles.vv}>{pickText(item.venue, lang)}</div>
              </div>
              <span className={`${styles.st} ${item.status === "soon" ? styles.soon : ""}`}>
                {item.status === "onSale" ? dict.musicStatusOnSale : dict.musicStatusSoon}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export { MusicScheduleView };
