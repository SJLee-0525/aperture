"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import styles from "./YouTubeFacade.module.css";

const PLAY_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

/** 영상 ID 가 아직 없는 항목의 자리 그림. 사이트 OG 이미지를 그대로 쓴다. */
const PLACEHOLDER_THUMBNAIL = "/opengraph-image";

type Props = {
  videoId: string;
  title: string;
  source?: string | undefined;
  playing: boolean;
  onPlay: () => void;
  className?: string | undefined;
};

/**
 * YouTube 영상 자리에 썸네일만 먼저 보여 주고, 방문자가 누른 것만 iframe 으로 바꾼다.
 *
 * 목록에 영상이 여러 개 있어도 페이지를 열자마자 유튜브로 요청이 나가지 않게 하는 것이 목적이다.
 * 재생 여부는 **부모가 들고 있는다**. 한 화면에서 하나만 재생할지(음악 목록) 각각 재생할지
 * (블로그 본문)가 화면마다 다르고, 소리가 겹치는 회귀를 이 컴포넌트 혼자서는 막을 수 없다.
 *
 * 썸네일은 `i.ytimg.com`, 재생은 `youtube.com/embed` 를 쓰며 두 호스트 모두 전역 CSP 에 열려 있다.
 *
 * @param props.videoId 11 자 영상 ID. 주소가 아니라 ID 를 받아 embed 주소를 여기서 조립한다.
 *   빈 문자열이면 재생할 수 없는 항목으로 보고 자리 그림만 그린다(관리자가 아직 ID 를 넣지 않은 경우).
 * @param props.title 재생 버튼과 iframe 의 accessible name. 비우면 영상을 구분할 수 없다.
 * @param props.source 제목 아래 한 줄. 없으면 그리지 않는다.
 * @param props.playing true 가 되면 iframe 으로 바뀌고 자동 재생한다.
 *   재생할 ID 가 없으면 true 여도 썸네일을 유지한다.
 * @param props.onPlay 썸네일을 눌렀을 때 호출한다.
 * @param props.className 바깥 비율 상자에 덧붙일 클래스.
 */
const YouTubeFacade = ({ videoId, title, source, playing, onPlay, className }: Props) => {
  const playable = videoId.length > 0;
  const [failedThumbnailId, setFailedThumbnailId] = useState<string | null>(null);
  const playerRef = useRef<HTMLIFrameElement>(null);
  const started = playing && playable;
  const usePlaceholder = !playable || failedThumbnailId === videoId;

  // 재생하면 포커스를 가진 버튼이 iframe 으로 교체된다. 옮기지 않으면 포커스가 body 로
  // 떨어져 다음 Tab 이 지면 처음부터 다시 시작한다. 영상 카드가 여럿이라 매번 반복된다.
  useEffect(() => {
    if (!started) return;
    playerRef.current?.focus({ preventScroll: true });
  }, [started]);

  return (
    <div className={className ? `${styles.frame} ${className}` : styles.frame}>
      {started ? (
        <iframe
          ref={playerRef}
          className={styles.player}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={title}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      ) : (
        <button type="button" className={styles.trigger} onClick={onPlay} aria-label={title}>
          <Image
            src={
              usePlaceholder
                ? PLACEHOLDER_THUMBNAIL
                : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            }
            alt=""
            fill
            sizes="(max-width: 720px) 100vw, 590px"
            className={styles.thumbnail}
            draggable={false}
            onError={() => {
              if (!usePlaceholder) setFailedThumbnailId(videoId);
            }}
          />
          <div className={styles.overlay}>
            <div className={styles.title}>{title}</div>
            {source ? <div className={styles.source}>{source}</div> : null}
          </div>
          <div className={styles.play}>{PLAY_ICON}</div>
        </button>
      )}
    </div>
  );
};

export { YouTubeFacade };
