"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useMounted } from "@/hooks/use-mounted";

import { clearFormRecovery, readFormRecovery, writeFormRecovery } from "@/lib/admin/form-recovery";

/** 입력이 멈춘 뒤 복구본을 뜨기까지 기다리는 시간. 타자 중에 매번 쓰지 않기 위한 값이다. */
const FORM_RECOVERY_DEBOUNCE_MS = 5_000;

type Options<T> = {
  /** JSON 이 문자열로 바꾼 Date 등을 폼 값으로 되돌린다. 없으면 그대로 쓴다. */
  revive?: (input: Record<string, unknown>) => T;
};

/**
 * 편집 중 값을 잃지 않게 하는 로컬 복구본.
 *
 * 저장과는 다른 일을 한다. 저장은 관리자가 누를 때만 하고, 이쪽은 입력이 5초 멈출 때마다 폼
 * 값을 브라우저에 떠 둔다. 새로고침·탭 닫힘으로 잃는 것을 막는 것이 전부이고, 저장에 성공하면
 * 지운다. 로그아웃도 지운다(`clearAdminWorkspace`).
 *
 * 화면에 들어올 때 남아 있는 복구본은 자동으로 덮어쓰지 않고 알리기만 한다. 저장본이 더 최신일
 * 수 있고 어느 쪽을 쓸지는 관리자가 안다. 저장소는 서버 렌더에 없으므로 마운트 이후에 읽고,
 * 그 뒤로는 다시 읽지 않는다. 편집 중에 다시 읽으면 방금 쓴 자기 복구본이 제안된다.
 *
 * @param collection 컬렉션 이름. 문서 ID 와 함께 키를 이룬다.
 * @param id 편집 중인 문서 ID. 설정 편집기처럼 문서가 하나면 컬렉션 이름을 그대로 쓴다.
 * @param form 현재 폼 값.
 * @param dirty 저장 이후 바뀐 것이 있는지. false 면 뜨지 않는다.
 */
const useFormRecovery = <T>(
  collection: string,
  id: string,
  form: T,
  dirty: boolean,
  options: Options<T> = {},
) => {
  const mounted = useMounted();
  const [handled, setHandled] = useState(false);
  const [found, setFound] = useState<{ savedAt: number; input: T } | null>(null);
  const readRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    if (!mounted || readRef.current) return;
    readRef.current = true;
    const revive = optionsRef.current.revive;
    setFound(
      readFormRecovery<T>(window.localStorage, collection, id, (input) =>
        revive ? revive(input) : (input as T),
      ),
    );
  }, [mounted, collection, id]);

  useEffect(() => {
    if (!dirty) return;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      writeFormRecovery(window.localStorage, collection, id, form);
    }, FORM_RECOVERY_DEBOUNCE_MS);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [collection, id, dirty, form]);

  const clear = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    clearFormRecovery(window.localStorage, collection, id);
    setHandled(true);
  }, [collection, id]);

  const restore = useCallback((): T | null => {
    if (!found) return null;
    clear();
    return found.input;
  }, [clear, found]);

  return { pending: handled ? null : found, restore, discard: clear, clear };
};

export { FORM_RECOVERY_DEBOUNCE_MS, useFormRecovery };
