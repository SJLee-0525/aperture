import { truncateUtf16Safely } from "@/lib/text/truncate-utf16-safely";

import type { DiscordEmbed } from "@/lib/discord/types";

type EmbedBudget = {
  title: number;
  description: number;
  footer: number;
  fieldName: number;
  fieldValue: number;
  fields: number;
  total: number;
};

/**
 * Discord embed 상한. 넘긴 카드는 400 으로 거부된다.
 * total 은 title·description·footer·field 이름과 값의 합에 적용된다.
 */
const DISCORD_LIMIT: EmbedBudget = {
  title: 256,
  description: 4096,
  footer: 2048,
  fieldName: 256,
  fieldValue: 1024,
  fields: 25,
  total: 6000,
};

/** 계열이 Discord 상한보다 좁게 쓰고 싶은 값만 적는다. 넓히거나 비정상인 값은 무시된다. */
type BudgetPolicy = Partial<EmbedBudget>;

/**
 * 정책 값을 Discord 상한 안의 정수로 정규화한다. 숫자가 아니거나 NaN·Infinity 면
 * 기본값으로 본다. NaN 이 남으면 total 초과 비교가 항상 거짓이 되어 초과 카드가 통과한다.
 */
const budgetValue = (key: keyof EmbedBudget, policy?: BudgetPolicy): number => {
  const configured = policy?.[key];
  if (typeof configured !== "number" || !Number.isFinite(configured)) return DISCORD_LIMIT[key];
  const narrowed = Math.min(DISCORD_LIMIT[key], Math.max(0, Math.floor(configured)));
  // total 0 은 만족할 수 있는 embed 가 없다. title 최소 1자와 함께 하한을 1 로 둔다.
  return key === "total" ? Math.max(1, narrowed) : narrowed;
};

/**
 * 잘린 사실이 드러나도록 말줄임표를 남긴다. 조용히 자르면 카드만 보고 목록이 끝난
 * 것으로 읽힌다. 서로게이트 페어를 쪼개지 않아 이모지 반쪽이 남지 않는다.
 * 결과 길이는 항상 max 이하이고, 상한 이하의 입력은 그대로 돌려준다.
 */
const truncate = (value: string, max: number): string => {
  if (max <= 0) return "";
  if (value.length <= max) return value;
  return `${truncateUtf16Safely(value, max - 1)}…`;
};

/** Discord 가 합계 상한에 세는 부분의 UTF-16 code unit 합. */
const embedLength = (embed: DiscordEmbed): number =>
  embed.title.length +
  (embed.description?.length ?? 0) +
  (embed.footer?.text.length ?? 0) +
  (embed.fields ?? []).reduce((sum, field) => sum + field.name.length + field.value.length, 0);

// truncate 가 말줄임표를 더하므로 한 번의 뺄셈으로는 감소량이 보장되지 않는다.
// 매번 현재 합계에서 초과분을 다시 계산한다.
const shrinkByExcess = (value: string, current: DiscordEmbed, total: number, floor = 0): string => {
  const excess = Math.max(0, embedLength(current) - total);
  return truncate(value, Math.max(floor, value.length - excess));
};

/**
 * embed 를 예산 안으로 줄인 복사본을 만든다. 입력 embed 와 fields 배열은 변형하지 않고,
 * 같은 예산으로 다시 적용해도 결과가 같다.
 *
 * 개별 상한을 다 맞춰도 합계는 6,400자(title 256 + description 4,096 + footer 2,048)까지
 * 갈 수 있다. 합계 초과분은 뒤쪽 field 부터 버리고 description, footer, title 순으로
 * 줄인다. 앞쪽일수록 판단에 먼저 쓰이는 정보다. title 은 1자 이상 남긴다.
 *
 * 이 함수가 보장하는 것은 예산뿐이다. 빈 title 이나 URL 형식 같은 나머지 embed 유효성은
 * 빌더의 몫이다.
 */
const fitEmbed = (embed: DiscordEmbed, policy?: BudgetPolicy): DiscordEmbed => {
  const total = budgetValue("total", policy);
  const description = embed.description
    ? truncate(embed.description, budgetValue("description", policy))
    : undefined;
  const footerText = embed.footer?.text
    ? truncate(embed.footer.text, budgetValue("footer", policy))
    : undefined;
  const fields = (embed.fields ?? [])
    .map((field) => ({
      ...field,
      name: truncate(field.name, budgetValue("fieldName", policy)),
      value: truncate(field.value, budgetValue("fieldValue", policy)),
    }))
    // Discord 는 이름이나 값이 빈 field 를 400 으로 거부한다.
    .filter((field) => field.name.trim() !== "" && field.value.trim() !== "")
    .slice(0, budgetValue("fields", policy));

  const result: DiscordEmbed = {
    ...embed,
    title: truncate(embed.title, budgetValue("title", policy)),
    description,
    footer: footerText === undefined ? undefined : { text: footerText },
    fields: embed.fields === undefined ? undefined : fields,
  };

  while (embedLength(result) > total && (result.fields?.length ?? 0) > 0) {
    result.fields?.pop();
  }
  if (embedLength(result) > total && result.description) {
    result.description = shrinkByExcess(result.description, result, total) || undefined;
  }
  if (embedLength(result) > total && result.footer) {
    const text = shrinkByExcess(result.footer.text, result, total);
    result.footer = text === "" ? undefined : { text };
  }
  if (embedLength(result) > total) {
    result.title = shrinkByExcess(result.title, result, total, 1);
  }
  return result;
};

export { DISCORD_LIMIT, embedLength, fitEmbed, truncate };
export type { BudgetPolicy };
