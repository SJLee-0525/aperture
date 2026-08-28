"use client";

import { useState } from "react";

import { YouTubeFacade } from "@/components/YouTubeFacade";

type Props = { videoId: string; title: string; source: string | null };

/**
 * 본문 안의 `::youtube` 한 개. 재생 상태를 자기가 들고 있다.
 *
 * 음악 목록과 달리 글 본문의 영상은 서로 다른 문맥에 흩어져 있어, 아래 영상을 튼다고
 * 위에서 보던 영상이 멈추면 오히려 이상하다. 그래서 상태를 위로 올리지 않는다.
 * 본문 렌더는 서버에서 끝나고 이 조각만 클라이언트로 넘어간다.
 *
 * @param props.videoId 검증을 통과한 11 자 영상 ID.
 * @param props.title 관리자가 입력한 제목. 접근 가능한 이름으로 쓴다.
 * @param props.source 출처 표기. 없으면 표시하지 않는다.
 */
const ArticleYouTube = ({ videoId, title, source }: Props) => {
  const [playing, setPlaying] = useState(false);

  return (
    <YouTubeFacade
      videoId={videoId}
      title={title}
      source={source ?? undefined}
      playing={playing}
      onPlay={() => setPlaying(true)}
    />
  );
};

export { ArticleYouTube };
