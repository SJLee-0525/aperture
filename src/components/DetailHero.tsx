"use client";

import { m } from "motion/react";
import Image from "next/image";
import Link from "next/link";

import { ShareButton } from "@/components/ShareButton";

import type { CSSProperties, ReactNode } from "react";

import styles from "./DetailHero.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;

type Props = {
  cover: { url: string; alt: string } | null;
  back: { href: string; label: string };
  share: { title: string; label: string; url?: string };
  minHeight?: number;
  children: ReactNode;
};

/**
 * 상세 지면 상단의 full-bleed 히어로 — 앨범 상세와 블로그 상세가 함께 쓴다.
 *
 * 배경 커버는 살짝 줌아웃되며 자리를 잡고 그 위의 텍스트가 뒤이어 떠오른다. 두 지면이 같은
 * 진입 연출과 뒤로가기·공유 버튼 위치를 갖게 하려고 motion 을 이 컴포넌트가 소유한다.
 * `motion/react` 의 `m` 을 쓰므로 `LazyMotion`(MotionProvider) 아래에서만 렌더된다.
 *
 * 대표 이미지가 없으면 빈 이미지 영역을 만들지 않고 타이포그래피형으로 그린다. 이때 scrim 을
 * 지우고 뒤로가기·공유 버튼을 일반 surface 스타일로 바꾼다 — 어두운 사진 위를 전제한 반투명
 * 검정 배경과 흰 글자는 밝은 배경에서 대비를 잃는다.
 *
 * 링크는 `next/link` 를 직접 쓴다. 이 계층(`components/`)은 언어 컨텍스트를 모르므로 로케일
 * 프리픽스를 붙인 주소를 호출부가 넘긴다.
 *
 * @param {Props} props
 * @param {{ url: string; alt: string } | null} props.cover 배경 커버. `null` 이면 타이포그래피형으로 바뀐다.
 * @param {{ href: string; label: string }} props.back 좌상단 복귀 링크. href 는 로케일 프리픽스를 포함한 완성된 경로다.
 * @param {{ title: string; label: string; url?: string }} props.share 우상단 공유 버튼. `url` 을 주면 현재 주소 대신 그 주소를 공유한다.
 * @param {number | undefined} props.minHeight 최소 높이(px). 기본 300 이며 내용이 길면 그만큼 늘어난다.
 * @param {ReactNode} props.children 제목·요약 같은 지면별 메타데이터. 텍스트 색은 소비하는 지면이 정한다.
 * @returns {JSX.Element}
 */
const DetailHero = ({ cover, back, share, minHeight, children }: Props) => {
  const style = minHeight
    ? ({ "--detail-hero-min-height": `${minHeight}px` } as CSSProperties)
    : undefined;

  return (
    <div
      className={styles.hero}
      data-variant={cover ? "image" : "plain"}
      style={style}
      {...(cover ? { "data-protected-image": "" } : {})}
    >
      {cover ? (
        <>
          <m.div
            className={styles.heroImgWrap}
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <Image
              src={cover.url}
              alt={cover.alt}
              fill
              sizes="100vw"
              className={styles.heroImg}
              draggable={false}
              priority
            />
          </m.div>
          <div className={styles.scrim} />
        </>
      ) : null}

      <Link href={back.href} prefetch={false} className={styles.back}>
        <span className={styles.arrowBack}>‹</span> <span>{back.label}</span>
      </Link>
      <ShareButton
        title={share.title}
        label={share.label}
        url={share.url}
        className={styles.share}
      />

      <m.div
        className={styles.heroText}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE, delay: 0.12 }}
      >
        {children}
      </m.div>
    </div>
  );
};

export { DetailHero };
