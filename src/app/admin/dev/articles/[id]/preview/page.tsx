import { ArticleFullPreview } from "@/features/admin-dev-articles/_components/ArticleFullPreview";

type Props = { params: Promise<{ id: string }> };

/**
 * 관리자 전용 전체 페이지 미리보기 (/admin/dev/articles/[id]/preview).
 * `/admin/*` 전체가 noindex 이고 sitemap 에도 없다.
 *
 * @param {Props} props
 * @param {Promise<{ id: string }>} props.params
 * @returns {Promise<JSX.Element>}
 */
const DevArticlePreviewPage = async ({ params }: Props) => {
  const { id } = await params;
  return <ArticleFullPreview articleId={id} />;
};

export default DevArticlePreviewPage;
