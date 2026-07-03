"use client";

import { useMemo } from "react";

import { AboutSection } from "@/components/AboutSection";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { DevConfig, DevProject } from "@/types/dev";

import styles from "./DevAboutView.module.css";

/** eyebrow 역할 라벨 — 태그라인 규칙상 언어 무관(고정). */
const EYEBROW = "Developer";

type Props = { config: DevConfig; projects: DevProject[] };

/** 소개 (/dev/about) — 공통 AboutSection(리드·통계·목록) + 하단 인터뷰 Q&A(dev 전용). */
const DevAboutView = ({ config, projects }: Props) => {
  const { dict, lang } = useLang();

  // heroLead 첫 문장 = 요약 헤드라인, 나머지 = 본문 (사진·음악 소개와 동일 패턴)
  const [summary, body] = useMemo(() => {
    const text = pickText(config.heroLead, lang);
    const at = text.indexOf(". ");
    return at === -1 ? [text, ""] : [text.slice(0, at), text.slice(at + 2)];
  }, [config.heroLead, lang]);

  const techTags = useMemo(
    () => [...new Set(projects.flatMap((project) => project.techTags))],
    [projects],
  );
  const fields = useMemo(
    () => [...new Set(projects.map((project) => pickText(project.category, lang)))],
    [projects, lang],
  );
  const stackCount = useMemo(
    () => config.stack.reduce((total, group) => total + group.items.length, 0),
    [config.stack],
  );

  return (
    <AboutSection
      eyebrow={EYEBROW}
      summary={summary}
      body={body}
      stats={[
        { value: projects.length, label: "PROJECTS" },
        { value: stackCount, label: "STACK" },
        { value: config.timeline.length, label: "CAREER" },
        { value: techTags.length, label: "TAGS" },
      ]}
      cols={[
        { label: dict.devTechLabel, items: techTags },
        { label: dict.devFieldLabel, items: fields },
        { label: dict.devStackLabel, items: config.stack.map((group) => group.category) },
      ]}
    >
      <div className={styles.qa}>
        {config.interview.map((item, index) => (
          <div key={index} className={styles.item}>
            <div className={styles.q}>{pickText(item.q, lang)}</div>
            <p className={styles.a}>{pickText(item.a, lang)}</p>
          </div>
        ))}
      </div>
    </AboutSection>
  );
};

export { DevAboutView };
