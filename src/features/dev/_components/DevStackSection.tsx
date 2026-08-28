"use client";

import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { useLang } from "@/features/lang/_hooks/use-lang";

import { ROUTES } from "@/constants/routes";

import type { DevStackGroup } from "@/types/dev";

import styles from "./DevStackSection.module.css";

type Props = { stack: DevStackGroup[]; className?: string };

/**
 * 카테고리별 기술 스택 칩 묶음. 경력 페이지의 후반부를 이루며 `main`과 페이지 여백은 `DevCareerView`가 소유한다.
 * 제목은 페이지 h1과 같은 크기·서체의 h2다. 이력과 역량은 성격이 다른 묶음이라 작은 섹션 라벨로 잇지 않고
 * 같은 위계의 제목 두 개로 나눠 읽게 한다.
 * 칩 배경·글자색은 관리자가 기술마다 입력한 데이터라 전역 토큰으로 대체할 수 없고 인라인 style로 넣는다.
 * 각 칩은 그 기술명으로 통합검색을 여는 링크이며, 로케일 프리픽스는 `LocalizedLink`가 붙인다.
 *
 * @param props.stack - 비어 있으면 제목까지 통째로 렌더하지 않는다. 학력·수상 섹션과 같은 규칙이다.
 * @param props.className - 앞 블록과의 간격처럼 배치는 호출부가 정한다.
 * @returns stack이 비면 null.
 */
const DevStackSection = ({ stack, className }: Props) => {
  const { dict } = useLang();

  if (stack.length === 0) return null;

  return (
    <section className={className}>
      <h2 className={styles.heading}>{dict.devStackHeading}</h2>
      <div className={styles.groups}>
        {stack.map((group) => (
          <div key={group.category} className={styles.group}>
            <h3 className="u-label">{group.category}</h3>
            <div className={styles.chips}>
              {group.items.map((item) => (
                <LocalizedLink
                  key={item.name}
                  href={`${ROUTES.SEARCH}?q=${encodeURIComponent(item.name)}`}
                  prefetch={false}
                  className={styles.chip}
                  style={{ background: item.bg, color: item.fg, borderColor: item.bg }}
                >
                  {item.name}
                </LocalizedLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export { DevStackSection };
