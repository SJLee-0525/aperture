"use client";

import Image from "next/image";

import { SectionHeading } from "@/components/SectionHeading";
import { ROUTES } from "@/constants/routes";
import { useLang } from "@/features/lang/use-lang";
import { useTyping } from "@/features/music/use-typing";
import { pickText } from "@/lib/i18n/pick-text";
import type {
  MusicAward,
  MusicConfig,
  MusicMedia,
  MusicSchedule,
  MusicWork,
} from "@/types/music";

import styles from "./MusicView.module.css";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
const md = (d: Date) => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;

const PLAY_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

type Props = {
  works: MusicWork[];
  schedule: MusicSchedule[];
  awards: MusicAward[];
  media: MusicMedia[];
  config: MusicConfig;
};

/**
 * 음악 섹션(피아니스트) — 단일 스크롤: 히어로(타이핑) + 연주·일정·수상·영상·연락처.
 * 연주/수상 모달·영상 iframe·?work= 딥링크는 B1-b. 여기선 표시(display)까지.
 */
const MusicView = ({ works, schedule, awards, media, config }: Props) => {
  const { dict, lang } = useLang();
  const typed = useTyping(config.typeWords);

  return (
    <div className={styles.mu}>
      <section className={styles.hero}>
        <div className={styles.eyebrow}>PIANIST</div>
        <h1 className={styles.name}>
          Sungjoon Lee
          <br />
          <span className={styles.role}>the pianist</span>
        </h1>
        <div className={styles.type}>
          {typed}
          <span className={styles.cursor} aria-hidden="true">
            &nbsp;
          </span>
        </div>
        <p className={styles.lead}>{pickText(config.heroLead, lang)}</p>
        <div className={styles.links}>
          {config.social.map((link, index) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className={index === 0 ? styles.primary : undefined}
            >
              {link.label}
            </a>
          ))}
          <a href={`${ROUTES.MUSIC}#works`}>{dict.musicWorksNav} ↓</a>
        </div>
      </section>

      <section id="works" className={styles.sec}>
        <SectionHeading num="01" title={dict.musicWorksNav} />
        <div className={styles.works}>
          {works.map((work) => (
            <figure key={work.id} className={styles.work}>
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
            </figure>
          ))}
        </div>
      </section>

      <section id="schedule" className={styles.sec}>
        <SectionHeading num="02" title={dict.musicScheduleNav} />
        <div className={styles.sch}>
          {schedule.map((item) => (
            <div key={item.id} className={styles.schRow}>
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
      </section>

      <section id="awards" className={styles.sec}>
        <SectionHeading num="03" title={dict.musicAwardsNav} />
        <div className={styles.aw}>
          {awards.map((award) => (
            <div key={award.id} className={styles.awRow}>
              <div className={styles.yr}>{award.year}</div>
              <div className={styles.an}>{pickText(award.name, lang)}</div>
              <div className={styles.ap}>{award.place}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="media" className={styles.sec}>
        <SectionHeading num="04" title={dict.musicMediaNav} />
        <div className={styles.vid}>
          {media.map((item) => (
            <div key={item.id} className={styles.v}>
              <div className={styles.facade}>
                <div className={styles.vt}>{pickText(item.title, lang)}</div>
                <div className={styles.vs}>{pickText(item.source, lang)}</div>
              </div>
              <div className={styles.play}>{PLAY_ICON}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className={styles.sec}>
        <SectionHeading num="05" title={dict.musicContactNav} />
        <div className={styles.contact}>
          <div className={styles.contactLead}>{dict.musicContactLead}</div>
          <div>
            <div className={styles.grp}>
              <div className={styles.k}>{dict.musicBookingLabel}</div>
              <a href={`mailto:${config.bookingEmail}`}>{config.bookingEmail}</a>
            </div>
            <div className={styles.grp}>
              <div className={styles.k}>{dict.socialLabel}</div>
              {config.social.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                  {link.label} ↗
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export { MusicView };
