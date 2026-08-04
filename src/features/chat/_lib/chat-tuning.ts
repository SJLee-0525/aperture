/**
 * 두 제공자가 공유해야 하는 생성 튜닝 값.
 *
 * 출력 토큰 상한과 응답 문자 상한은 한 쌍으로 맞춘다 — 1,200자는 한국어 기준
 * 대략 1,000~1,500 토큰이고 구조화 JSON 래퍼가 더해지므로 2,048 안에서 여유가 남는다.
 * 한쪽만 올리거나 내리면 잘림이 잦아지므로 항상 함께 조정한다.
 *
 * 사고(reasoning/thinking) 토큰도 이 상한을 소모하므로 양쪽 모두 0으로 둔다.
 * 표현 방식은 제공자마다 달라(`reasoning.effort` / `thinkingConfig.thinkingBudget`)
 * 각 제공자 파일에 남기고, 여기서는 "왜 끄는지"만 기록한다.
 *
 * temperature 는 공유하지 않는다 — OpenAI Responses API 의 추론 모델은 이 값을
 * 받지 않으므로 Gemini 전용 상수로 그쪽 파일에 둔다.
 */
const MAX_OUTPUT_TOKENS = 2_048;
const MAX_RESPONSE_CHARS = 1_200;

export { MAX_OUTPUT_TOKENS, MAX_RESPONSE_CHARS };
