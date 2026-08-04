import { getChoseong } from "es-hangul";

/**
 * 텍스트의 한글 초성 나열을 만든다 — 서버(검색 인덱스 빌드) 전용, 클라 번들엔 실리지 않는다.
 * 공백까지 지워 어절 경계를 넘는 초성 질의("ㅇㅎㅅ"⊂"가을호수")도 잡는다 — 초성 검색
 * 특성상 오탐보다 리콜이 낫고, 랭킹에서 최하위 가중이라 상위 노출을 오염시키지 않는다.
 */
const choseongOf = (text: string): string => getChoseong(text).replace(/\s+/g, "");

export { choseongOf };
