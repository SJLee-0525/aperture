"use client";

import { useRegisterChatScreenTarget } from "@/hooks/use-register-chat-screen-target";

type Props = { id: string; title: string };

/**
 * 열어 둔 글을 챗봇 화면 문맥으로 등록한다. 그리는 것은 없다.
 *
 * 상세 경로는 slug 이고 문서 ID 가 URL 에 없다. 질문을 보낼 때 서버가 다시 조회할 식별자는
 * 바뀌지 않는 문서 ID 여야 하므로, 화면이 그 값을 알려 주는 자리가 필요하다.
 * 도구 등록(`BlogTools`)과 파일을 나눈 이유는 챗봇과 WebMCP 의 수명·조건이 서로 다르기 때문이다.
 *
 * @param {Props} props
 * @param {string} props.id 글 문서 ID.
 * @param {string} props.title 챗봇 입력창 칩에 보여 줄 제목.
 * @returns {null}
 */
const ArticleScreenTarget = ({ id, title }: Props) => {
  useRegisterChatScreenTarget({ type: "article", id, label: title });
  return null;
};

export { ArticleScreenTarget };
