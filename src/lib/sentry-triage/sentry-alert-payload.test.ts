import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  MAX_FRAMES,
  normalizeSentryAlert,
} from "@/lib/sentry-triage/sentry-alert-payload";

/**
 * 실제 Sentry 가 보낸 issue alert 본문(docs/plan/10 §13.2 캡처).
 * 식별자와 도메인은 예시 값으로 바꿨고 구조는 그대로다. 손으로 만든 입력만 쓰면
 * Sentry 가 실제로 보내는 형태와 어긋나도 테스트가 통과한다.
 */
const FIXTURE = readFileSync(path.join(__dirname, "__fixtures__/event-alert.json"), "utf8");

const parsedFixture = () => JSON.parse(FIXTURE) as Record<string, never>;

const withEvent = (mutate: (event: Record<string, unknown>) => void): string => {
  const payload = parsedFixture() as unknown as { data: { event: Record<string, unknown> } };
  mutate(payload.data.event);
  return JSON.stringify(payload);
};

describe("normalizeSentryAlert — 실물 계약", () => {
  it("식별자와 표시 필드를 뽑는다", () => {
    const summary = normalizeSentryAlert(FIXTURE);

    expect(summary).toMatchObject({
      issueId: "1000000001",
      eventId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      title: "EvalError: capture A2",
      culprit: "/:lang",
      level: "error",
      environment: "production",
      release: "aperture@ca70576a",
      triggeredRule: "Alert on all issues in selected projects",
    });
  });

  it("exception.values 에서 타입과 메시지를 읽는다", () => {
    const summary = normalizeSentryAlert(FIXTURE);

    expect(summary?.exceptionType).toBe("EvalError");
    expect(summary?.exceptionValue).toBe("capture A2");
  });

  it("in-app 프레임만 최신 순으로 남긴다", () => {
    const summary = normalizeSentryAlert(FIXTURE);

    // 픽스처의 stacktrace 는 [sentry 내부(in_app=false), captureA2(in_app=true)] 순이다.
    expect(summary?.frames).toEqual([
      { filename: "<anonymous>", function: "captureA2", lineno: 2 },
    ]);
  });

  it("허용한 태그 세 개만 남긴다", () => {
    const summary = normalizeSentryAlert(FIXTURE);

    expect(summary?.tags).toEqual({
      app_runtime: "browser",
      area: "public",
      transaction: "/:lang",
    });
  });

  it("short_id 가 없는 페이로드를 그대로 받아들인다", () => {
    expect(normalizeSentryAlert(FIXTURE)?.shortId).toBeUndefined();
  });
});

describe("normalizeSentryAlert — 화이트리스트", () => {
  const serialized = () => JSON.stringify(normalizeSentryAlert(FIXTURE));

  it("방문자 위치를 담지 않는다", () => {
    expect(parsedFixture()).toHaveProperty("data.event.user.geo.city");
    expect(serialized()).not.toContain("Example-gu");
  });

  it("요청 URL 과 태그 URL 을 담지 않는다", () => {
    expect(serialized()).not.toContain("example.com");
  });

  it("Replay 식별자를 담지 않는다", () => {
    expect(serialized()).not.toContain("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  });

  it("breadcrumb 를 담지 않는다", () => {
    expect(serialized()).not.toContain("breadcrumb");
    expect(serialized()).not.toContain("sentry.event");
  });

  it("소스 본문(context_line)을 담지 않는다", () => {
    expect(serialized()).not.toContain("{snip}");
  });

  it("요약 키를 계약대로 고정한다", () => {
    const summary = normalizeSentryAlert(FIXTURE);

    expect(Object.keys(summary ?? {}).sort()).toEqual([
      "culprit",
      "environment",
      "eventId",
      "exceptionType",
      "exceptionValue",
      "frames",
      "issueId",
      "level",
      "release",
      "shortId",
      "tags",
      "title",
      "triggeredRule",
      "webUrl",
    ]);
  });
});

describe("normalizeSentryAlert — 결손 입력", () => {
  it("JSON 이 아니면 null 이다", () => {
    expect(normalizeSentryAlert("not json")).toBeNull();
  });

  it("data.event 가 없으면 null 이다", () => {
    expect(normalizeSentryAlert(JSON.stringify({ action: "triggered", data: {} }))).toBeNull();
  });

  it("issue_id 가 없으면 null 이다", () => {
    const raw = withEvent((event) => {
      delete event.issue_id;
    });

    expect(normalizeSentryAlert(raw)).toBeNull();
  });

  it("숫자 issue_id 도 문자열로 받는다", () => {
    const raw = withEvent((event) => {
      event.issue_id = 1000000001;
    });

    expect(normalizeSentryAlert(raw)?.issueId).toBe("1000000001");
  });

  it("event_id 가 없으면 본문 해시로 대체한다", () => {
    const raw = withEvent((event) => {
      delete event.event_id;
    });

    const eventId = normalizeSentryAlert(raw)?.eventId;

    expect(eventId).toMatch(/^[0-9a-f]{32}$/);
    expect(normalizeSentryAlert(raw)?.eventId).toBe(eventId);
  });

  it("본문이 다르면 대체 키도 다르다", () => {
    const first = withEvent((event) => {
      delete event.event_id;
    });
    const second = withEvent((event) => {
      delete event.event_id;
      event.level = "warning";
    });

    expect(normalizeSentryAlert(first)?.eventId).not.toBe(normalizeSentryAlert(second)?.eventId);
  });

  it("title 이 없으면 예외 타입과 메시지로 만든다", () => {
    const raw = withEvent((event) => {
      delete event.title;
    });

    expect(normalizeSentryAlert(raw)?.title).toBe("EvalError: capture A2");
  });

  it("title 과 예외가 모두 없으면 기본 문구를 쓴다", () => {
    const raw = withEvent((event) => {
      delete event.title;
      delete event.exception;
      delete event.metadata;
    });

    expect(normalizeSentryAlert(raw)?.title).toBe("(제목 없음)");
  });

  it("exception 이 없어도 metadata 로 타입을 채운다", () => {
    const raw = withEvent((event) => {
      delete event.exception;
    });

    const summary = normalizeSentryAlert(raw);

    expect(summary?.exceptionType).toBe("EvalError");
    expect(summary?.frames).toEqual([]);
  });

  it("tags 가 배열이 아니면 빈 객체를 쓴다", () => {
    const raw = withEvent((event) => {
      event.tags = { app_runtime: "browser" };
    });

    expect(normalizeSentryAlert(raw)?.tags).toEqual({});
  });

  it("in-app 프레임이 없으면 빈 배열이다", () => {
    const raw = withEvent((event) => {
      const values = (event.exception as { values: { stacktrace: { frames: unknown[] } }[] })
        .values;
      values[0].stacktrace.frames = values[0].stacktrace.frames.map((frame) => ({
        ...(frame as Record<string, unknown>),
        in_app: false,
      }));
    });

    expect(normalizeSentryAlert(raw)?.frames).toEqual([]);
  });

  it("프레임이 많으면 최신 것부터 상한만큼 남긴다", () => {
    const raw = withEvent((event) => {
      const values = (event.exception as { values: { stacktrace: { frames: unknown[] } }[] })
        .values;
      values[0].stacktrace.frames = Array.from({ length: MAX_FRAMES + 5 }, (_, index) => ({
        filename: "app.ts",
        function: `frame${index}`,
        lineno: index,
        in_app: true,
      }));
    });

    const frames = normalizeSentryAlert(raw)?.frames ?? [];

    expect(frames).toHaveLength(MAX_FRAMES);
    expect(frames[0]?.function).toBe(`frame${MAX_FRAMES + 4}`);
  });

  it("이름도 파일도 없는 프레임은 버린다", () => {
    const raw = withEvent((event) => {
      const values = (event.exception as { values: { stacktrace: { frames: unknown[] } }[] })
        .values;
      values[0].stacktrace.frames = [{ in_app: true, lineno: 3 }];
    });

    expect(normalizeSentryAlert(raw)?.frames).toEqual([]);
  });

  it("원인 예외가 여러 개면 마지막으로 던져진 것을 쓴다", () => {
    const raw = withEvent((event) => {
      const exception = event.exception as { values: unknown[] };
      exception.values = [
        { type: "TypeError", value: "cause", stacktrace: { frames: [] } },
        ...exception.values,
      ];
    });

    expect(normalizeSentryAlert(raw)?.exceptionType).toBe("EvalError");
  });
});
