/**
 * UTF-16 code unit 상한으로 자르되 서로게이트 페어를 쪼개지 않는다.
 *
 * `slice` 는 이모지처럼 두 code unit 을 쓰는 문자의 한가운데를 자를 수 있고, 남은 반쪽은
 * 화면에 대체 문자로 보인다. 상한은 code unit 기준을 그대로 두고 끝에 남은 앞쪽 절반만
 * 떼어 내, 길이 계산에 기대는 기존 예산 계약을 바꾸지 않는다.
 *
 * @param {string} value 자를 문자열.
 * @param {number} maxCodeUnits 허용하는 최대 code unit 수.
 * @returns {string} 상한 이내로 자른 문자열.
 */
const truncateUtf16Safely = (value: string, maxCodeUnits: number): string => {
  if (maxCodeUnits <= 0) return "";
  if (value.length <= maxCodeUnits) return value;
  const code = value.charCodeAt(maxCodeUnits - 1);
  // 마지막 자리가 상위 서로게이트면 짝이 잘려 나가므로 한 자리를 더 뺀다.
  const end = code >= 0xd800 && code <= 0xdbff ? maxCodeUnits - 1 : maxCodeUnits;
  return value.slice(0, end);
};

export { truncateUtf16Safely };
