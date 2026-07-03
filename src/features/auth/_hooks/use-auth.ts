"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

import { subscribeAuth } from "@/lib/firebase/auth";

/** 관리자 UID (UI 가드용). 실제 권한은 Firestore/Storage Rules 가 판별 — 여기서는 화면 편의만. */
const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID;

type AuthState = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
};

/** 현재 인증 상태 구독. loading=최초 판별 전, isAdmin=로그인 + UID 일치. */
const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeAuth((next) => {
      setUser(next);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading, isAdmin: user != null && user.uid === ADMIN_UID };
};

export { useAuth };
