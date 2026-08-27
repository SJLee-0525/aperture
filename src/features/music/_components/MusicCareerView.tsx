"use client";

import { AwardDetailModal } from "@/components/AwardDetailModal";
import { AwardList } from "@/components/AwardList";
import { TimelineList } from "@/components/TimelineList";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useMusicAwardTools } from "@/features/music/_hooks/use-music-tools";
import { useQueryModal } from "@/hooks/use-query-modal";
import { useRegisterChatScreenTarget } from "@/hooks/use-register-chat-screen-target";

import { pickText } from "@/lib/i18n/pick-text";

import type { MusicAward, MusicConfig } from "@/types/music";
import type { TimelineEntry } from "@/types/timeline";

import styles from "./MusicCareerView.module.css";

type Props = { config: MusicConfig; awards: MusicAward[] };

/**
 * 경력 (/music/career) — 학력 + 경력 타임라인 + 수상(클릭 시 상세 모달, ?award= 딥링크).
 *
 * @param {Props} props
 * @param {MusicConfig} props.config
 * @param {MusicAward[]} props.awards
 * @returns {JSX.Element}
 */
const MusicCareerView = ({ config, awards }: Props) => {
  const { dict, lang } = useLang();
  const { active: selected, open, select, close } = useQueryModal("award", awards);
  // WebMCP 도구 — 미지원 브라우저에선 no-op(어댑터 기능 감지).
  useMusicAwardTools(awards);
  // 선택한 수상 내역의 이름을 챗봇 입력창에 표시한다.
  useRegisterChatScreenTarget(
    selected ? { type: "award", id: selected.id, label: pickText(selected.name, lang) } : null,
  );

  const toRows = (entries: TimelineEntry[]) =>
    entries.map((entry) => ({ period: entry.period, text: pickText(entry.title, lang) }));

  return (
    <main className="u-page-main">
      <h1 className={styles.title}>{dict.musicCareerNav}</h1>

      <TimelineList label={dict.musicEducationLabel} rows={toRows(config.education)} />
      <TimelineList
        label={dict.musicCareerNav}
        rows={toRows(config.career)}
        className={styles.stacked}
      />

      <AwardList
        label={dict.musicAwardsNav}
        awards={awards.map((award) => ({
          id: award.id,
          year: award.year,
          name: pickText(award.name, lang),
          place: award.place,
        }))}
        onSelect={select}
      />

      <AwardDetailModal
        award={
          selected
            ? {
                year: selected.year,
                name: pickText(selected.name, lang),
                place: selected.place,
                description: pickText(selected.description, lang),
              }
            : null
        }
        label={dict.musicAwardsNav}
        closeLabel={dict.closeLabel}
        open={open}
        onClose={close}
      />
    </main>
  );
};

export { MusicCareerView };
