/**
 * AI 트리아지 파이프라인을 실제 서버 오류로 한 번 확인하기 위한 임시 라우트다.
 * 확인이 끝나면 이 파일을 삭제한다 (docs/checklist/10-sentry-ai-triage.md).
 *
 * 합성 오류(`throw new Error(...)`)는 스택이 한 프레임뿐이라 판정 품질을 볼 수 없다.
 * 이 저장소에서 실제로 나올 법한 모양으로 만든다. Supabase 의 `data jsonb` 는 타입 단언으로
 * 들어오므로 타입 검사를 통과한 채 실제 행에 없는 필드를 참조할 수 있다.
 */

type PhotoRow = { id: string; image: { url: string } };

const thumbnailUrl = (row: PhotoRow): string => row.image.url.replace("/main/", "/thumb/");

export const runtime = "nodejs";

export function GET(): Response {
  const rows = JSON.parse(
    '[{"id":"a","image":{"url":"/main/1.webp"}},{"id":"b","image":null}]',
  ) as PhotoRow[];

  return Response.json(rows.map(thumbnailUrl));
}
