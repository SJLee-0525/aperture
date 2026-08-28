import { notFound } from "next/navigation";

/**
 * 로케일 안의 매칭되지 않는 주소를 잡는 catch-all.
 *
 * 루트 `app/not-found.tsx` 가 앱 전체의 미매칭 URL 을 처리하므로, `[lang]/not-found.tsx`
 * 만으로는 `/en/bogus` 가 여전히 로케일 밖 404 로 간다. 중첩 not-found 는 그 세그먼트
 * 안에서 던진 `notFound()` 만 받는다. 여기서 던져야 URL 의 언어로 렌더된다.
 *
 * 한 세그먼트짜리 주소(`/ko/bogus`)는 `(public)/[legalDoc]` 이 `dynamicParams = false` 로
 * 먼저 잡는다. 그쪽도 같은 `[lang]/not-found.tsx` 로 수렴하므로 결과는 같고, 이 파일은
 * 두 세그먼트 이상(`/ko/a/b`)을 맡는다.
 *
 * @returns 항상 404 를 던진다.
 */
export default function LocaleCatchAll(): never {
  notFound();
}
