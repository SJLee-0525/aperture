/** textarea 의 선택 구간. 커서만 있을 때는 시작과 끝이 같다. */
type TextSelection = { start: number; end: number };

type InsertResult = { value: string; selection: TextSelection };

/**
 * 커서 위치(또는 선택 구간)에 조각을 끼워 넣는다.
 *
 * 삽입한 조각은 앞뒤를 빈 줄로 띄운다. 이미지와 영상은 단독 블록일 때만 블록으로 인식되고
 * (`markdown-normalize`), 문장 중간에 붙으면 발행이 막히기 때문이다. 이미 빈 줄이 있으면
 * 더 넣지 않아 문단 사이가 벌어지지 않는다.
 *
 * @param {string} value 현재 본문 전체.
 * @param {TextSelection} selection 커서 또는 선택 구간. 범위 밖 값은 본문 길이에 맞춘다.
 * @param {string} snippet 끼워 넣을 Markdown 조각.
 * @returns {InsertResult} 새 본문과 조각 뒤로 옮긴 커서 위치. 호출부가 textarea 에 되돌려 준다.
 */
const insertAtSelection = (
  value: string,
  selection: TextSelection,
  snippet: string,
): InsertResult => {
  const start = Math.min(Math.max(selection.start, 0), value.length);
  const end = Math.min(Math.max(selection.end, start), value.length);

  const before = value.slice(0, start);
  const after = value.slice(end);
  const lead =
    before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail =
    after === "" || after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";

  const inserted = `${lead}${snippet}${trail}`;
  const caret = start + inserted.length - trail.length;

  return { value: `${before}${inserted}${after}`, selection: { start: caret, end: caret } };
};

/**
 * 대괄호·괄호가 문법을 깨지 않도록 한 줄로 눌러 담는다.
 *
 * @param {string} text 사용자가 입력한 설명·제목.
 * @returns {string} 줄바꿈과 대괄호를 없앤 값.
 */
const inline = (text: string): string =>
  text
    .replace(/[\r\n]+/g, " ")
    .replace(/[[\]]/g, "")
    .trim();

/**
 * 본문 이미지 조각을 만든다. 캡션이 있으면 바로 다음 줄에 붙인다 —
 * `::caption` 은 바로 앞 이미지에만 연결된다(계획 §3).
 *
 * @param {string} url 업로드한 이미지 주소.
 * @param {string} alt 대체 텍스트.
 * @param {string} [caption] 캡션. 비어 있으면 줄 자체를 넣지 않는다.
 * @returns {string} 삽입할 Markdown.
 */
const imageMarkdown = (url: string, alt: string, caption?: string): string => {
  const image = `![${inline(alt)}](${url})`;
  const text = caption ? inline(caption) : "";
  return text ? `${image}\n::caption[${text}]` : image;
};

/**
 * YouTube 조각을 만든다. 제목은 facade 와 iframe 의 accessible name 이라 필수이고,
 * 출처는 선택이다(계획 §4).
 *
 * @param {string} url 영상 주소. 검증은 렌더 단계의 `::youtube` 해석이 맡는다.
 * @param {string} title 영상 제목.
 * @param {string} [source] 출처 표기.
 * @returns {string} 삽입할 Markdown.
 */
const youtubeMarkdown = (url: string, title: string, source?: string): string => {
  const attributes = [`title="${inline(title).replace(/"/g, "")}"`];
  const text = source ? inline(source).replace(/"/g, "") : "";
  if (text) attributes.push(`source="${text}"`);
  return `::youtube[${url.trim()}]{${attributes.join(" ")}}`;
};

export { imageMarkdown, insertAtSelection, youtubeMarkdown };
