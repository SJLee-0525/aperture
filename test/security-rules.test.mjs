// Firestore·Storage Security Rules 회귀 테스트.
// 실행: npm run test:rules (firebase emulators:exec가 두 에뮬레이터를 띄운다)
// firebase-tools는 JDK 21+가 필요하다.
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, it } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, setLogLevel, updateDoc } from "firebase/firestore";
import { deleteObject, getBytes, listAll, ref, uploadBytes } from "firebase/storage";

const ADMIN_UID = "KBBvgyMIssPngwx9n0OXaL2THwy1";
const OTHER_UID = "not-the-admin-uid";
const PUBLIC_COLLECTIONS = [
  "musicWorks",
  "musicAwards",
  "musicMedia",
  "devProjects",
  "ragDocuments",
];

let testEnv;

before(async () => {
  setLogLevel("error");
  testEnv = await initializeTestEnvironment({
    projectId: "demo-aperture",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
    storage: {
      rules: readFileSync("storage.rules", "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await Promise.all([testEnv.clearFirestore(), testEnv.clearStorage()]);
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await Promise.all([
      setDoc(doc(db, "photos", "pub"), { published: true, title: { ko: "가", en: "A" } }),
      setDoc(doc(db, "photos", "draft"), {
        published: false,
        title: { ko: "나", en: "B" },
      }),
      setDoc(doc(db, "albums", "pub"), { published: true, order: 0 }),
      setDoc(doc(db, "albums", "draft"), { published: false, order: 1 }),
      setDoc(doc(db, "site", "config"), { name: { ko: "이성준", en: "Sungjoon Lee" } }),
      setDoc(doc(db, "site", "music"), { intro: { ko: "", en: "" } }),
      setDoc(doc(db, "site", "dev"), { heroLead: { ko: "", en: "" } }),
      setDoc(doc(db, "secret", "x"), { any: true }),
      ...PUBLIC_COLLECTIONS.flatMap((collection) => [
        setDoc(doc(db, collection, "pub"), { published: true, order: 0 }),
        setDoc(doc(db, collection, "draft"), { published: false, order: 1 }),
      ]),
    ]);
    await uploadBytes(ref(ctx.storage(), "seed/public.webp"), new Uint8Array([1]), {
      contentType: "image/webp",
    });
  });
});

describe("Firestore 방문자 읽기", () => {
  it("공개 Photo와 Album만 읽을 수 있다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "photos", "pub")));
    await assertFails(getDoc(doc(db, "photos", "draft")));
    await assertSucceeds(getDoc(doc(db, "albums", "pub")));
    await assertFails(getDoc(doc(db, "albums", "draft")));
  });

  it("Music·Dev·RAG의 published 문서만 읽을 수 있다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    for (const collection of PUBLIC_COLLECTIONS) {
      await assertSucceeds(getDoc(doc(db, collection, "pub")));
      await assertFails(getDoc(doc(db, collection, "draft")));
    }
  });

  it("site 설정 문서는 공개 읽기 가능하다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    for (const id of ["config", "music", "dev"]) {
      await assertSucceeds(getDoc(doc(db, "site", id)));
    }
  });
});

describe("Firestore 공개 쓰기 금지", () => {
  it("비로그인은 공개 Photo도 수정할 수 없다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(updateDoc(doc(db, "photos", "pub"), { order: 10 }));
    await assertFails(setDoc(doc(db, "photos", "new"), { published: true }));
    await assertFails(deleteDoc(doc(db, "photos", "pub")));
  });

  it("비로그인은 Album·Music·Dev·site를 쓸 수 없다", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    for (const collection of ["albums", ...PUBLIC_COLLECTIONS]) {
      await assertFails(setDoc(doc(db, collection, "new"), { published: true }));
    }
    await assertFails(setDoc(doc(db, "site", "config"), { name: { ko: "x", en: "x" } }));
  });

  it("로그인한 비관리자도 모든 콘텐츠 쓰기가 거부된다", async () => {
    const db = testEnv.authenticatedContext(OTHER_UID).firestore();
    for (const collection of ["photos", "albums", ...PUBLIC_COLLECTIONS]) {
      await assertFails(setDoc(doc(db, collection, "new"), { published: true }));
    }
    await assertFails(setDoc(doc(db, "site", "dev"), { heroLead: { ko: "x", en: "x" } }));
  });
});

describe("Firestore 관리자 권한", () => {
  it("초안 콘텐츠를 읽고 모든 명시된 컬렉션에 쓸 수 있다", async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(getDoc(doc(db, "photos", "draft")));
    for (const collection of ["photos", "albums", ...PUBLIC_COLLECTIONS]) {
      await assertSucceeds(setDoc(doc(db, collection, "new"), { published: false, order: 0 }));
      await assertSucceeds(updateDoc(doc(db, collection, "new"), { order: 1 }));
      await assertSucceeds(deleteDoc(doc(db, collection, "new")));
    }
    await assertSucceeds(
      setDoc(doc(db, "site", "config"), { name: { ko: "관리자", en: "Admin" } }),
    );
  });
});

describe("Firestore 기본 거부", () => {
  it("정의되지 않은 컬렉션은 관리자도 접근할 수 없다", async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertFails(getDoc(doc(db, "secret", "x")));
    await assertFails(setDoc(doc(db, "secret", "y"), { any: true }));
  });
});

describe("Storage Rules", () => {
  it("누구나 공개 파일을 읽을 수 있다", async () => {
    const storage = testEnv.unauthenticatedContext().storage();
    await assertSucceeds(getBytes(ref(storage, "seed/public.webp")));
  });

  it("경로 목록 조회는 관리자만 할 수 있다", async () => {
    const anonymous = testEnv.unauthenticatedContext().storage();
    const admin = testEnv.authenticatedContext(ADMIN_UID).storage();
    await assertFails(listAll(ref(anonymous, "seed")));
    await assertSucceeds(listAll(ref(admin, "seed")));
  });

  it("비로그인과 비관리자는 업로드·삭제할 수 없다", async () => {
    const anonymous = testEnv.unauthenticatedContext().storage();
    const other = testEnv.authenticatedContext(OTHER_UID).storage();
    await assertFails(
      uploadBytes(ref(anonymous, "photos/anonymous.webp"), new Uint8Array([1]), {
        contentType: "image/webp",
      }),
    );
    await assertFails(
      uploadBytes(ref(other, "photos/other.webp"), new Uint8Array([1]), {
        contentType: "image/webp",
      }),
    );
    await assertFails(deleteObject(ref(anonymous, "seed/public.webp")));
  });

  it("관리자는 10MB 미만 이미지를 업로드하고 삭제할 수 있다", async () => {
    const storage = testEnv.authenticatedContext(ADMIN_UID).storage();
    const imageRef = ref(storage, "photos/admin.webp");
    await assertSucceeds(
      uploadBytes(imageRef, new Uint8Array([1, 2, 3]), { contentType: "image/webp" }),
    );
    await assertSucceeds(deleteObject(imageRef));
  });

  it("관리자라도 비이미지와 10MB 이상 파일은 업로드할 수 없다", async () => {
    const storage = testEnv.authenticatedContext(ADMIN_UID).storage();
    await assertFails(
      uploadBytes(ref(storage, "photos/file.txt"), new Uint8Array([1]), {
        contentType: "text/plain",
      }),
    );
    await assertFails(
      uploadBytes(ref(storage, "photos/large.webp"), new Uint8Array(10 * 1024 * 1024), {
        contentType: "image/webp",
      }),
    );
  });
});
