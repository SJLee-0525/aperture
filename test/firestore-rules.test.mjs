// Firestore Security Rules 유닛 테스트 (@firebase/rules-unit-testing + node:test)
//   실행: npm run test:rules  (firebase emulators:exec 가 Firestore 에뮬레이터를 띄운 뒤 이 파일을 돌린다)
//   ⚠️ firebase-tools 는 JDK 21+ 필요 — java 가 PATH 에 있어야 한다(에뮬레이터가 JVM 을 띄움).
//   목적: 이 프로젝트의 백엔드 = Rules 이므로, "좋아요 +1 예외"를 포함한 접근 제어를 회귀 검증한다.
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, it } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  increment,
  setDoc,
  setLogLevel,
  updateDoc,
} from "firebase/firestore";

// firestore.rules 의 isAdmin() 에 하드코딩된 값과 반드시 동일해야 한다.
const ADMIN_UID = "KBBvgyMIssPngwx9n0OXaL2THwy1";
const OTHER_UID = "not-the-admin-uid";

let testEnv;

before(async () => {
  setLogLevel("error"); // SDK 경고 소음 억제
  testEnv = await initializeTestEnvironment({
    projectId: "demo-aperture",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

// 각 테스트 전에 Rules 를 우회해 시드 데이터를 심는다.
beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "photos", "pub"), {
      published: true,
      likes: 0,
      title: { ko: "가", en: "A" },
    });
    await setDoc(doc(db, "photos", "draft"), {
      published: false,
      likes: 0,
      title: { ko: "나", en: "B" },
    });
    await setDoc(doc(db, "albums", "pubAlbum"), { published: true, order: 0 });
    await setDoc(doc(db, "albums", "draftAlbum"), { published: false, order: 1 });
    await setDoc(doc(db, "site", "config"), { name: { ko: "이성준", en: "Sungjoon Lee" } });
    await setDoc(doc(db, "secret", "x"), { any: true });
  });
});

describe("방문자(비로그인) 읽기", () => {
  it("published 사진은 읽을 수 있다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "photos", "pub")));
  });
  it("초안(published=false) 사진은 읽을 수 없다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "photos", "draft")));
  });
  it("published 앨범은 읽을 수 있고, 초안 앨범은 읽을 수 없다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "albums", "pubAlbum")));
    await assertFails(getDoc(doc(db, "albums", "draftAlbum")));
  });
  it("site/config 는 공개 읽기 가능", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "site", "config")));
  });
});

describe("★ 좋아요 익명 +1 (유일한 무인증 쓰기)", () => {
  it("+1 은 허용된다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(updateDoc(doc(db, "photos", "pub"), { likes: increment(1) }));
  });
  it("+2 는 거부된다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(updateDoc(doc(db, "photos", "pub"), { likes: increment(2) }));
  });
  it("-1(감소)은 거부된다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(updateDoc(doc(db, "photos", "pub"), { likes: increment(-1) }));
  });
  it("likes 와 함께 다른 필드를 바꾸면 거부된다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(db, "photos", "pub"), { likes: increment(1), title: { ko: "해킹", en: "x" } }),
    );
  });
  it("초안 사진에는 +1 도 거부된다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(updateDoc(doc(db, "photos", "draft"), { likes: increment(1) }));
  });
  it("로그인한 비관리자도 +1 은 가능하다", async () => {
    const db = testEnv.authenticatedContext(OTHER_UID).firestore();
    await assertSucceeds(updateDoc(doc(db, "photos", "pub"), { likes: increment(1) }));
  });
});

describe("방문자/비관리자 쓰기 금지", () => {
  it("비로그인은 사진을 생성할 수 없다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, "photos", "new"), { published: true, likes: 0 }));
  });
  it("비로그인은 사진을 삭제할 수 없다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(deleteDoc(doc(db, "photos", "pub")));
  });
  it("비로그인은 앨범/site 를 쓸 수 없다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, "albums", "pubAlbum"), { published: true, order: 5 }));
    await assertFails(setDoc(doc(db, "site", "config"), { name: { ko: "x", en: "x" } }));
  });
  it("로그인한 비관리자는 관리자 쓰기를 할 수 없다", async () => {
    const db = testEnv.authenticatedContext(OTHER_UID).firestore();
    await assertFails(setDoc(doc(db, "photos", "new"), { published: true, likes: 0 }));
    await assertFails(setDoc(doc(db, "albums", "a"), { published: true, order: 9 }));
  });
});

describe("관리자(정확한 UID)", () => {
  it("초안 사진도 읽을 수 있다", async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(getDoc(doc(db, "photos", "draft")));
  });
  it("사진 생성·수정·삭제가 가능하다", async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, "photos", "new"), { published: false, likes: 0, order: 0 }),
    );
    await assertSucceeds(updateDoc(doc(db, "photos", "pub"), { published: false }));
    await assertSucceeds(deleteDoc(doc(db, "photos", "pub")));
  });
  it("앨범·site 를 쓸 수 있다", async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(setDoc(doc(db, "albums", "a"), { published: true, order: 0 }));
    await assertSucceeds(
      setDoc(doc(db, "site", "config"), { name: { ko: "이성준", en: "Sungjoon Lee" } }),
    );
  });
});

describe("기본 거부 (미정의 컬렉션)", () => {
  it("정의되지 않은 컬렉션은 관리자여도 읽기·쓰기 모두 거부된다", async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertFails(getDoc(doc(db, "secret", "x")));
    await assertFails(setDoc(doc(db, "secret", "y"), { any: true }));
  });
});
