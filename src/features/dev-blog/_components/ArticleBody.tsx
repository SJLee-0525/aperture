"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useState, type ReactNode } from "react";

import { ArticleCodeBlock } from "@/features/dev-blog/_components/ArticleCodeBlock";
import { ArticleYouTube } from "@/features/dev-blog/_components/ArticleYouTube";

import { collectArticleImages } from "@/features/dev-blog/_lib/article-images";
import {
  articleCodeHighlightKey,
  type ArticleCodeHighlights,
} from "@/features/dev-blog/_lib/markdown-highlight-map";

import { DICTIONARY } from "@/constants/dictionary";
import { localizePath } from "@/lib/i18n/locale-path";
import { SITE_IMAGE_SIZE } from "@/lib/seo/site-meta";

import type {
  ArticleBlock,
  ArticleDocument,
  ArticleInline,
} from "@/features/dev-blog/_lib/markdown-nodes";
import type { Lang } from "@/types/lang";

import styles from "./ArticleBody.module.css";

/** 확대 뷰는 처음 열 때만 불러온다. */
const ImageLightbox = dynamic(
  () => import("@/components/ImageLightbox").then((module) => module.ImageLightbox),
  { ssr: false },
);

/** 새 탭 링크에 적용할 보안 rel 속성. */
const EXTERNAL_LINK_REL = "noreferrer noopener";

/** 크기를 알기 전까지 사용할 기본 가로 이미지 비율. */
const FALLBACK_IMAGE_SIZE = { w: 1600, h: 1000 } as const;

/**
 * 이미지를 불러오지 못했을 때 표시하는 워드마크.
 * 빈 영역 대신 개발 섹션에서 사용하는 이미지를 보여 준다.
 *
 * 라이트박스는 두 테마 모두 어두운 scrim 위에 뜨므로 그쪽은 항상 dark 를 쓴다.
 */
const BROKEN_IMAGE_FALLBACK = {
  light: "/dev-project-image",
  dark: "/dev-project-image-dark",
} as const;

/** 위 워드마크의 실제 크기. 라이트박스 스테이지 비율과 본문 자리 예약에 함께 쓴다. */
const BROKEN_IMAGE_SIZE = { w: SITE_IMAGE_SIZE.width, h: SITE_IMAGE_SIZE.height } as const;

const renderInlines = (nodes: ArticleInline[], lang: Lang): ReactNode[] =>
  nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return node.value;
      case "strong":
        return <strong key={index}>{renderInlines(node.children, lang)}</strong>;
      case "emphasis":
        return <em key={index}>{renderInlines(node.children, lang)}</em>;
      case "inlineCode":
        return (
          <code key={index} className={styles.inlineCode}>
            {node.value}
          </code>
        );
      case "break":
        return <br key={index} />;
      case "link": {
        const children = renderInlines(node.children, lang);
        // 내부 경로는 현재 언어 프리픽스를 붙여야 한다. 서버에서 렌더하므로 클라이언트
        // 훅에 기대는 LocalizedLink 대신 같은 계산을 하는 순수 함수를 쓴다.
        if (node.target === "internal") {
          return (
            <Link key={index} href={localizePath(lang, node.href)} className={styles.inlineLink}>
              {children}
            </Link>
          );
        }
        return (
          <a
            key={index}
            href={node.href}
            className={styles.inlineLink}
            {...(node.target === "external"
              ? { target: "_blank", rel: EXTERNAL_LINK_REL }
              : undefined)}
          >
            {children}
          </a>
        );
      }
    }
  });

/** 블록 렌더가 아래로 들고 다니는 값. 인자가 늘 때마다 재귀 호출을 전부 고치지 않게 묶는다. */
type RenderContext = {
  lang: Lang;
  highlights: ArticleCodeHighlights;
  /** 이미지 주소별 첫 번째 라이트박스 인덱스. */
  imageIndex: ReadonlyMap<string, number>;
  onOpenImage: (index: number) => void;
  /** 라이트박스 비율 계산에 사용할 원본 픽셀 크기. */
  onMeasureImage: (src: string, width: number, height: number) => void;
  /** 로드에 실패해 본문과 라이트박스에서 대체 이미지를 사용할 주소. */
  brokenImages: Readonly<Record<string, true>>;
  onImageError: (src: string) => void;
};

/**
 * 실려 온 이미지의 원본 크기를 올려 보내고 자리표시 비율을 걷는다.
 * 클래스를 DOM 에서 직접 떼는 이유는 크기를 알게 될 때마다 본문 트리를 다시 만들지 않기 위해서다.
 *
 * @param {HTMLImageElement} node 크기를 읽을 이미지 요소.
 * @param {string} src 라이트박스가 쓰는 이미지 주소.
 * @param {RenderContext} context 본문 렌더 문맥.
 * @returns {void}
 */
const measureImage = (node: HTMLImageElement, src: string, context: RenderContext): void => {
  if (!node.naturalWidth || !node.naturalHeight) return;
  node.classList.remove(styles.unknownImageSize);
  context.onMeasureImage(src, node.naturalWidth, node.naturalHeight);
};

const renderBlocks = (blocks: ArticleBlock[], context: RenderContext): ReactNode[] => {
  const { lang, highlights } = context;

  return blocks.map((block, index) => {
    switch (block.type) {
      case "heading": {
        const Heading = `h${block.depth}` as const;
        return (
          <Heading key={index} id={block.id} className={styles.heading}>
            {renderInlines(block.children, lang)}
          </Heading>
        );
      }

      case "paragraph":
        return <p key={index}>{renderInlines(block.children, lang)}</p>;

      case "list": {
        const items = block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderBlocks(item.children, context)}</li>
        ));
        return block.ordered ? <ol key={index}>{items}</ol> : <ul key={index}>{items}</ul>;
      }

      case "blockquote":
        return (
          <blockquote key={index} className={styles.quote}>
            {renderBlocks(block.children, context)}
          </blockquote>
        );

      case "thematicBreak":
        return <hr key={index} className={styles.rule} />;

      case "table":
        return (
          // 표는 좁은 화면에서 본문 폭을 넘기므로 스스로 가로 스크롤한다. 스크롤되는 영역은
          // 포인터 없이도 닿아야 해서 포커스를 받는 region 으로 둔다(정책 지면과 같은 처리).
          <div
            key={index}
            className={styles.tableScroll}
            role="region"
            aria-label={DICTIONARY[lang].articleTableLabel}
            tabIndex={0}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  {block.header.map((cell, cellIndex) => (
                    // 정렬은 관리자가 원문에 적은 값이라 토큰으로 표현할 수 없다.
                    <th key={cellIndex} style={{ textAlign: block.align[cellIndex] ?? undefined }}>
                      {renderInlines(cell, lang)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        style={{ textAlign: block.align[cellIndex] ?? undefined }}
                      >
                        {renderInlines(cell, lang)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "code":
        return (
          <ArticleCodeBlock
            key={index}
            rawLanguage={block.rawLanguage}
            value={block.value}
            tokens={
              block.language
                ? (highlights[articleCodeHighlightKey(block.language, block.value)] ?? null)
                : null
            }
          />
        );

      case "image":
        return (
          <figure key={index} className={styles.figure}>
            {/* 눌러서 크게 볼 수 있으므로 버튼이다. 포인터 없이도 닿아야 하고, 확대는
                조작이지 이동이 아니라 링크가 아니다. */}
            <button
              type="button"
              className={styles.imageButton}
              aria-label={`${block.alt} — ${DICTIONARY[lang].articleImageZoomLabel}`}
              onClick={() => context.onOpenImage(context.imageIndex.get(block.src) ?? 0)}
            >
              {context.brokenImages[block.src] ? (
                // 로드에 실패하면 테마에 맞는 워드마크를 표시한다.
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={BROKEN_IMAGE_FALLBACK.light}
                    alt={block.alt}
                    width={BROKEN_IMAGE_SIZE.w}
                    height={BROKEN_IMAGE_SIZE.h}
                    className={styles.fallbackLight}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={BROKEN_IMAGE_FALLBACK.dark}
                    alt={block.alt}
                    width={BROKEN_IMAGE_SIZE.w}
                    height={BROKEN_IMAGE_SIZE.h}
                    className={styles.fallbackDark}
                  />
                </>
              ) : (
                <>
                  {/* 전역 설정이 Vercel 최적화를 끄고 Storage 파일을 그대로 보내므로 next/image
                      대신 img 를 쓴다. 원문에 크기를 적은 이미지는 그 값으로 자리를 잡고,
                      적지 않은 이미지는 실려 온 뒤 원본 픽셀 크기를 올려 보낸다. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={block.src}
                    alt={block.alt}
                    width={block.dimensions?.width}
                    height={block.dimensions?.height}
                    className={block.dimensions ? undefined : styles.unknownImageSize}
                    // 캐시에 있는 이미지는 hydration 전에 load 가 끝나 onLoad 가 잡히지 않는다.
                    // 마운트 시점에 이미 완료됐으면 여기서 크기를 읽는다.
                    ref={(node) => {
                      if (node?.complete) measureImage(node, block.src, context);
                    }}
                    loading="lazy"
                    decoding="async"
                    onLoad={(event) => measureImage(event.currentTarget, block.src, context)}
                    onError={() => context.onImageError(block.src)}
                  />
                </>
              )}
            </button>
            {block.caption ? <figcaption>{block.caption}</figcaption> : null}
          </figure>
        );

      case "youtube":
        return (
          <ArticleYouTube
            key={index}
            videoId={block.videoId}
            title={block.title}
            source={block.source}
          />
        );
    }
  });
};

type Props = { document: ArticleDocument; lang: Lang; highlights: ArticleCodeHighlights };

/**
 * 검증을 통과한 본문 트리를 화면에 그린다. 공개 상세와 관리자 미리보기가 같은 컴포넌트를 쓴다.
 *
 * 여기서 다루는 노드 종류는 `markdown-nodes` 가 정의한 것이 전부다. 원문 문자열도 HTML 문자열도
 * 받지 않으므로 `dangerouslySetInnerHTML` 이 필요한 자리가 없고, 허용 목록 밖의 요소는 애초에
 * 이 함수까지 오지 않는다.
 *
 * 색칠은 호출부가 `highlightArticleDocument` 로 미리 끝내 결과만 넘기므로, 서버에서 렌더하는
 * 공개 상세와 브라우저에서 렌더하는 관리자 미리보기가 같은 코드를 쓰면서도 문법 번들은
 * 서버에만 남는다.
 *
 * 본문 이미지는 눌러서 크게 볼 수 있고 그 글의 이미지들을 앞뒤로 넘긴다. 확대 뷰는 프로젝트
 * 캐러셀과 같은 `ImageLightbox` 이고, 그 안에 들어가야 처음 열릴 때 내려온다.
 *
 * ⚠️ Markdown 은 주소를 하나만 담는다. 지금은 본문과 확대 뷰가 같은 파일을 쓰고, 960 프리뷰와
 * 본문에는 2048px 메인 이미지 주소를 사용한다.
 *
 * 본문은 한국어 원문 하나뿐이라 컨테이너에 `lang="ko"` 를 못 박는다. 영어 경로에서도 같은
 * 원문을 보여 주므로, 이 표시가 없으면 보조 기술과 브라우저 번역이 문서 언어를 잘못 읽는다.
 *
 * @param {Props} props
 * @param {ArticleDocument} props.document `parseArticleMarkdown` 이 만든 렌더 트리.
 * @param {Lang} props.lang 내부 링크에 붙일 언어 프리픽스. 본문 언어와는 별개다.
 * @param {ArticleCodeHighlights} props.highlights 코드 블록 색칠 결과. 키가 없는 블록은 색 없이 그린다.
 * @returns {JSX.Element}
 */
const ArticleBody = ({ document, lang, highlights }: Props) => {
  const dict = DICTIONARY[lang];
  const images = useMemo(() => collectArticleImages(document), [document]);
  const imageIndex = useMemo(
    () =>
      images.reduce<Map<string, number>>(
        (map, image, index) => (map.has(image.src) ? map : map.set(image.src, index)),
        new Map(),
      ),
    [images],
  );

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // 본문 이미지가 실려 온 뒤 알게 되는 원본 크기. 라이트박스는 이 비율로 스테이지를 잡는다.
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});

  // 본문과 확대 뷰가 같은 이미지 오류 상태를 사용한다.
  const [brokenImages, setBrokenImages] = useState<Record<string, true>>({});

  const onMeasureImage = useCallback((src: string, width: number, height: number) => {
    if (!width || !height) return;
    setSizes((previous) =>
      previous[src] ? previous : { ...previous, [src]: { w: width, h: height } },
    );
  }, []);

  const onImageError = useCallback((src: string) => {
    setBrokenImages((previous) => (previous[src] ? previous : { ...previous, [src]: true }));
  }, []);

  const lightboxImages = useMemo(
    () =>
      images.map(({ src, dimensions }) =>
        // 로드에 실패한 이미지도 목록에 남겨 탐색 인덱스를 유지한다.
        // 확대 뷰는 두 테마 모두 어두운 scrim 위라 워드마크도 dark 를 쓴다.
        brokenImages[src]
          ? { url: BROKEN_IMAGE_FALLBACK.dark, path: src, ...BROKEN_IMAGE_SIZE }
          : {
              url: src,
              path: src,
              // 실려 온 크기가 가장 정확하고, 없으면 원문에 적힌 크기를 쓴다. 둘 다 없는 옛 글은
              // 임시 비율로 연다. 스테이지는 `object-fit: contain` 이라 잘리지 않고 여백만 생긴다.
              ...(sizes[src] ??
                (dimensions ? { w: dimensions.width, h: dimensions.height } : FALLBACK_IMAGE_SIZE)),
            },
      ),
    [images, sizes, brokenImages],
  );

  // 본문 트리는 통째로 메모한다. 이미지 크기와 라이트박스 개폐는 본문 밖의 상태이며,
  // 크기를 처음 알게 될 때의 자리표시 클래스 제거는 DOM 노드에서 직접 한다.
  const blocks = useMemo(
    () =>
      renderBlocks(document.blocks, {
        lang,
        highlights,
        imageIndex,
        onOpenImage: setOpenIndex,
        onMeasureImage,
        brokenImages,
        onImageError,
      }),
    [document, lang, highlights, imageIndex, onMeasureImage, brokenImages, onImageError],
  );

  return (
    <div className={styles.body} lang="ko">
      {blocks}

      {openIndex !== null && lightboxImages.length > 0 ? (
        <ImageLightbox
          images={lightboxImages}
          index={openIndex}
          alt={images[openIndex]?.alt ?? ""}
          closeLabel={dict.closeLabel}
          previousLabel={dict.previousImageLabel}
          nextLabel={dict.nextImageLabel}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      ) : null}
    </div>
  );
};

export { ArticleBody };
