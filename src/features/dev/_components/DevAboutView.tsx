"use client";

import { useMemo } from "react";

import { AboutSection } from "@/components/AboutSection";

import { useLang } from "@/features/lang/_hooks/use-lang";

import { pickText } from "@/lib/i18n/pick-text";

import type { DevConfig } from "@/types/dev";

import styles from "./DevAboutView.module.css";

/** eyebrow 역할 라벨 — 태그라인 규칙상 언어 무관(고정). */
const EYEBROW = "Developer";

/** site/dev 중 이 뷰가 소비하는 필드만 + 프로젝트별 기술 태그 —
 *  전체 DevConfig(typeWords·URL·social)·DevProject(트러블슈팅·이미지 등)는 불필요. */
type Props = {
  heroLead: DevConfig["heroLead"];
  stack: DevConfig["stack"];
  interview: DevConfig["interview"];
  timelineCount: number;
  projectTechTags: string[][];
};

/**
 * 소개 (/dev) — 공통 AboutSection(리드·통계·목록) + 하단 인터뷰 Q&A(dev 전용).
 * 개발 섹션의 첫 화면이다. 통계·목록은 프로젝트와 스택에서 파생하므로 표시용 값만 받고
 * 원본 컬렉션을 통째로 직렬화하지 않는다.
 *
 * @param {Props} props
 * @param {LocalizedText} props.heroLead - 첫 문장을 요약 헤드라인으로, 나머지를 본문으로 나눈다.
 * @param {DevStackGroup[]} props.stack - 카테고리 이름만 목록 컬럼에 쓴다. 칩 상세는 경력·기술 페이지 소관이다.
 * @param {DevInterview[]} props.interview
 * @param {number} props.timelineCount - 경력 항목 수. 통계 카운터에만 쓰므로 항목 본문은 받지 않는다.
 * @param {string[][]} props.projectTechTags - 프로젝트별 태그. 중복을 제거해 사용 기술 목록과 통계를 만든다.
 * @returns {JSX.Element}
 */
const DevAboutView = ({ heroLead, stack, interview, timelineCount, projectTechTags }: Props) => {
  const { dict, lang } = useLang();

  // heroLead 첫 문장 = 요약 헤드라인, 나머지 = 본문 (사진·음악 소개와 동일 패턴)
  const [summary, body] = useMemo(() => {
    const text = pickText(heroLead, lang);
    const at = text.indexOf(". ");
    return at === -1 ? [text, ""] : [text.slice(0, at), text.slice(at + 2)];
  }, [heroLead, lang]);

  const techTags = useMemo(() => [...new Set(projectTechTags.flat())], [projectTechTags]);
  const stackCount = useMemo(
    () => stack.reduce((total, group) => total + group.items.length, 0),
    [stack],
  );

  return (
    <AboutSection
      lang={lang}
      eyebrow={EYEBROW}
      summary={summary}
      body={body}
      stats={[
        { value: projectTechTags.length, label: dict.statProjects },
        { value: stackCount, label: dict.statStack },
        { value: timelineCount, label: dict.statCareer },
        { value: techTags.length, label: dict.statTags },
      ]}
      cols={[
        { label: dict.devTechLabel, items: techTags },
        { label: dict.devStackLabel, items: stack.map((group) => group.category) },
      ]}
      showMoreLabel={dict.aboutShowMore}
      showLessLabel={dict.aboutShowLess}
    >
      <div className={styles.qa}>
        {interview.map((item, index) => (
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
