import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

/**
 * Firebase 초기화 단일 출처 — 다른 모든 firebase 래퍼는 여기서 싱글턴을 가져온다.
 * 웹 API 키는 공개돼도 안전(보안은 Security Rules 담당, 아키텍처 원칙 #1).
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * 싱글턴은 값이 아니라 함수로 내보낸다.
 *
 * 값으로 두면 이 모듈을 import 하는 순간 `getAuth` 가 돌고, API 키가 없으면 그 자리에서
 * `auth/invalid-api-key` 로 멈춘다. 관리자 화면은 트리 어딘가에서 반드시 이 모듈에 닿으므로
 * mock 모드로 개발하려는 사람도, 프리렌더 중 Client Component 를 평가하는 빌드도 함께 막혔다.
 * 호출 시점으로 미루면 실제로 Firestore·Storage·Auth 를 쓰는 코드만 설정을 요구한다.
 *
 * 반환은 동기다. Promise 로 바꾸면 저장소 getter 를 쓰는 hook 의 의존성 배열이 매 렌더
 * 무효화되어 재조회 루프가 된다. 여기서 미루는 것은 **모듈 평가 시점**이지 호출 규약이 아니다.
 *
 * @returns {FirebaseApp} 앱 싱글턴. HMR·중복 import 에서도 하나만 만든다.
 */
const getFirebaseApp = (): FirebaseApp => getApps()[0] ?? initializeApp(firebaseConfig);

let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

/**
 * Firebase Auth 싱글턴.
 *
 * @returns {Auth} 인증 인스턴스. 설정이 없으면 여기서 `auth/invalid-api-key` 가 난다.
 */
const getFirebaseAuth = (): Auth => (authInstance ??= getAuth(getFirebaseApp()));

/**
 * Firestore 싱글턴. 관리자 쓰기 경로 전용이며 공개 읽기는 REST 경계를 쓴다.
 *
 * @returns {Firestore} Firestore 인스턴스.
 */
const getFirebaseDb = (): Firestore => (dbInstance ??= getFirestore(getFirebaseApp()));

/**
 * Firebase Storage 싱글턴.
 *
 * @returns {FirebaseStorage} Storage 인스턴스.
 */
const getFirebaseStorage = (): FirebaseStorage =>
  (storageInstance ??= getStorage(getFirebaseApp()));

export { getFirebaseApp, getFirebaseAuth, getFirebaseDb, getFirebaseStorage };
