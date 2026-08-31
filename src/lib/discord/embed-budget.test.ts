import { describe, expect, it } from "vitest";

import { DISCORD_LIMIT, embedLength, fitEmbed, truncate } from "@/lib/discord/embed-budget";

import type { DiscordEmbed } from "@/lib/discord/types";

describe("truncate", () => {
  it("상한 이하 문자열은 말줄임표 없이 그대로 돌려준다", () => {
    expect(truncate("가나다", 3)).toBe("가나다");
    expect(truncate("", 5)).toBe("");
  });

  it("상한을 넘으면 말줄임표를 포함해 상한 길이로 자른다", () => {
    const result = truncate("a".repeat(10), 5);
    expect(result).toBe("aaaa…");
    expect(result).toHaveLength(5);
  });

  it.each([0, -1])("상한 %d 은 빈 문자열을 돌려준다", (max) => {
    expect(truncate("abc", max)).toBe("");
  });

  it("상한 1 은 말줄임표 하나가 된다", () => {
    expect(truncate("abc", 1)).toBe("…");
  });

  it("절단 경계의 서로게이트 페어를 쪼개지 않는다", () => {
    // 😀 는 두 code unit 이다. 상한 3 → 말줄임표 자리를 빼면 2번째 code unit 에서 잘리는데,
    // 그 자리가 페어 한가운데라 이모지를 통째로 버려야 한다.
    const result = truncate("a😀b", 3);
    expect(result).toBe("a…");
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("결과 길이는 항상 상한 이하다", () => {
    for (const max of [1, 2, 3, 5, 8]) {
      expect(truncate("😀😀😀😀", max).length).toBeLessThanOrEqual(max);
    }
  });

  it("같은 상한으로 두 번 적용해도 결과가 같다", () => {
    const once = truncate("가".repeat(100), 10);
    expect(truncate(once, 10)).toBe(once);
  });
});

describe("fitEmbed", () => {
  const oversized = (): DiscordEmbed => ({
    title: "t".repeat(500),
    url: "https://example.com/issue",
    description: "d".repeat(5_000),
    color: 0xe5484d,
    fields: Array.from({ length: 30 }, (_, index) => ({
      name: `field ${index}`,
      value: "v".repeat(2_000),
    })),
    footer: { text: "f".repeat(3_000) },
  });

  it("개별 상한과 합계 상한을 모두 만족한다", () => {
    const result = fitEmbed(oversized());

    expect(result.title).toHaveLength(DISCORD_LIMIT.title);
    expect(result.description!.length).toBeLessThanOrEqual(DISCORD_LIMIT.description);
    expect(result.footer!.text.length).toBeLessThanOrEqual(DISCORD_LIMIT.footer);
    expect(result.fields!.length).toBeLessThanOrEqual(DISCORD_LIMIT.fields);
    expect(result.fields!.every((field) => field.value.length <= DISCORD_LIMIT.fieldValue)).toBe(
      true,
    );
    expect(embedLength(result)).toBeLessThanOrEqual(DISCORD_LIMIT.total);
  });

  it("입력 embed 와 fields 배열을 변형하지 않는다", () => {
    const input = oversized();
    const fieldsBefore = input.fields!.length;
    const titleBefore = input.title;

    fitEmbed(input);

    expect(input.fields).toHaveLength(fieldsBefore);
    expect(input.title).toBe(titleBefore);
    expect(input.fields![0]!.value).toHaveLength(2_000);
  });

  it("같은 예산으로 두 번 적용해도 결과가 같다", () => {
    const once = fitEmbed(oversized());
    expect(fitEmbed(once)).toEqual(once);

    const policy = { description: 1_000, footer: 500, fields: 10 };
    const narrow = fitEmbed(oversized(), policy);
    expect(fitEmbed(narrow, policy)).toEqual(narrow);
  });

  it("좁은 정책만 반영하고 넓히는 정책은 Discord 상한으로 잘라낸다", () => {
    const narrow = fitEmbed(oversized(), { description: 1_000, footer: 500, fields: 10 });
    expect(narrow.description!.length).toBeLessThanOrEqual(1_000);
    expect(narrow.footer!.text.length).toBeLessThanOrEqual(500);
    expect(narrow.fields!.length).toBeLessThanOrEqual(10);

    const widened = fitEmbed(oversized(), { total: 999_999, fields: 100 });
    expect(widened.fields!.length).toBeLessThanOrEqual(DISCORD_LIMIT.fields);
    expect(embedLength(widened)).toBeLessThanOrEqual(DISCORD_LIMIT.total);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 0.5])(
    "비정상 정책 값 %s 도 합계 상한을 깨지 못한다",
    (total) => {
      const result = fitEmbed(oversized(), { total });
      expect(embedLength(result)).toBeLessThanOrEqual(DISCORD_LIMIT.total);
    },
  );

  it("이름이나 값이 빈 field 를 제거한다", () => {
    const result = fitEmbed({
      title: "제목",
      color: 0,
      fields: [
        { name: "유지", value: "값" },
        { name: "", value: "값" },
        { name: "이름", value: "  " },
      ],
    });
    expect(result.fields).toEqual([{ name: "유지", value: "값" }]);
  });

  it("합계 초과분은 뒤쪽 field 부터 버린다", () => {
    const result = fitEmbed({
      title: "제목",
      color: 0,
      fields: Array.from({ length: 8 }, (_, index) => ({
        name: `f${index}`,
        value: "v".repeat(1_000),
      })),
    });
    expect(result.fields!.map((field) => field.name)).toEqual(["f0", "f1", "f2", "f3", "f4"]);
  });

  it("field 없이 title·description·footer 만으로 6,400자가 되면 description 을 줄인다", () => {
    const result = fitEmbed({
      title: "t".repeat(DISCORD_LIMIT.title),
      description: "d".repeat(DISCORD_LIMIT.description),
      color: 0,
      footer: { text: "f".repeat(DISCORD_LIMIT.footer) },
    });
    expect(embedLength(result)).toBeLessThanOrEqual(DISCORD_LIMIT.total);
    expect(result.title).toHaveLength(DISCORD_LIMIT.title);
    expect(result.footer!.text).toHaveLength(DISCORD_LIMIT.footer);
  });

  it("description 을 다 줄여도 넘으면 footer 까지 줄인다", () => {
    const result = fitEmbed(
      {
        title: "t".repeat(200),
        description: "d".repeat(100),
        color: 0,
        footer: { text: "f".repeat(2_000) },
      },
      { total: 300 },
    );
    expect(embedLength(result)).toBeLessThanOrEqual(300);
    expect(result.title).toHaveLength(200);
  });

  it.each([1, 0])("total %d 정책에서도 title 1자를 남기고 상한을 만족한다", (total) => {
    const result = fitEmbed(oversized(), { total });
    // total 0 은 1 로 정규화된다. 만족할 수 있는 embed 가 없기 때문이다.
    expect(embedLength(result)).toBeLessThanOrEqual(1);
    expect(result.title).toBe("…");
    expect(result.fields).toEqual([]);
  });

  it("합계 축소 경계에 걸린 이모지를 쪼개지 않는다", () => {
    const result = fitEmbed(
      { title: "제목", description: "😀".repeat(200), color: 0 },
      { total: 9 },
    );
    expect(embedLength(result)).toBeLessThanOrEqual(9);
    // 남은 description 이 홀수 개 code unit 으로 끝나면 마지막은 말줄임표여야 한다.
    expect(result.description!.at(-1)).toBe("…");
  });

  it("빈 description 과 footer 는 undefined 로 정리한다", () => {
    const result = fitEmbed({ title: "제목", description: "", color: 0, footer: { text: "" } });
    expect(result.description).toBeUndefined();
    expect(result.footer).toBeUndefined();
  });
});
