"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

import { isWebMcpSupported } from "@/lib/webmcp/model-context";

import type { ArticleToolData } from "@/features/dev-blog/_lib/article-tool-data";
import type { DevArticleTag } from "@/types/dev-article-tag";

/** 지원 브라우저에서만 로드하는 도구 등록 청크 — 미지원 방문자 비용은 이 게이트 몇 줄뿐. */
const BlogToolsRegistry = dynamic(
  () => import("./BlogToolsRegistry").then((module) => module.BlogToolsRegistry),
  { ssr: false },
);

/** 지원 여부는 세션 동안 불변 — 구독할 변화가 없어 no-op unsubscribe 를 돌려준다. */
const subscribeNothing = () => () => {};

type Props = { articles: ArticleToolData[]; tags: DevArticleTag[] };

/**
 * 블로그 지면의 WebMCP 도구 게이트. 그리는 것은 없다.
 *
 * 목록과 상세가 같은 도구 두 개를 쓰므로 컴포넌트 하나를 두 지면에서 마운트한다.
 * 기존 뷰(`ArticlesView`·`ArticleDetailView`)에 도구 책임을 얹지 않는 이유는 도구가
 * 화면 상태가 아니라 서버 투영만 쓰기 때문이다. 지면을 떠나면 등록이 함께 해제된다.
 *
 * 기능 감지는 전역 도구(`WebMcpTools`)와 같은 방식이다. 서버 스냅샷이 항상 false 라
 * SSR 마크업이 변하지 않고, 미지원 브라우저는 등록 청크를 받지 않는다.
 * 게이트는 청크만 막는다. `articles`·`tags` 는 client component 의 prop 이라 지원 여부와
 * 무관하게 RSC payload 로 직렬화된다.
 *
 * @param {Props} props
 * @param {ArticleToolData[]} props.articles 공개 글 투영.
 * @param {DevArticleTag[]} props.tags 태그 사전 전체.
 * @returns {JSX.Element | null}
 */
const BlogTools = ({ articles, tags }: Props) => {
  const supported = useSyncExternalStore(subscribeNothing, isWebMcpSupported, () => false);
  return supported ? <BlogToolsRegistry articles={articles} tags={tags} /> : null;
};

export { BlogTools };
