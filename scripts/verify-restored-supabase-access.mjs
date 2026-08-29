#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const rl = createInterface({ input: stdin, output: stdout });

const url = (await rl.question("복구 프로젝트 URL: ")).replace(/\/$/, "");
const publishableKey = await rl.question("복구 프로젝트 publishable key: ");
const email = await rl.question("복원된 관리자 이메일: ");
rl.close();

const readPassword = async () => {
  if (!stdin.isTTY || !stdin.setRawMode) {
    throw new Error("비밀번호 입력에는 대화형 터미널이 필요합니다.");
  }

  stdout.write("기존 관리자 비밀번호: ");
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  return await new Promise((resolve, reject) => {
    let value = "";
    const onData = (character) => {
      if (character === "\u0003") {
        stdin.setRawMode(false);
        stdin.pause();
        reject(new Error("입력을 취소했습니다."));
        return;
      }
      if (character === "\r" || character === "\n") {
        stdin.off("data", onData);
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write("\n");
        resolve(value);
        return;
      }
      if (character === "\u007f") {
        value = value.slice(0, -1);
        return;
      }
      value += character;
    };
    stdin.on("data", onData);
  });
};

const password = await readPassword();
const probeId = `restore-access-probe-${randomUUID()}`;
const storagePath = `restore-drill/${probeId}.png`;
let accessToken = "";
let dbProbeCreated = false;
let storageProbeCreated = false;

const request = async (path, options = {}) => {
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: publishableKey,
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  return { response, text };
};

const requireStatus = ({ response, text }, expected, label) => {
  if (!expected.includes(response.status)) {
    throw new Error(`${label} 실패: HTTP ${response.status} ${text}`);
  }
};

try {
  const login = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  requireStatus(login, [200], "기존 관리자 로그인");
  accessToken = JSON.parse(login.text).access_token;
  const claims = JSON.parse(
    Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8"),
  );
  if (claims.app_metadata?.role !== "admin") {
    throw new Error("새 JWT에 app_metadata.role=admin이 없습니다.");
  }
  console.log("관리자 로그인·role claim 확인");

  const createProbe = await request("/rest/v1/photos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      id: probeId,
      published: false,
      sort_order: 0,
      data: { restoreDrill: true },
    }),
  });
  requireStatus(createProbe, [201], "관리자 insert");
  dbProbeCreated = true;

  const anonRead = await request(
    `/rest/v1/photos?id=eq.${encodeURIComponent(probeId)}&select=id`,
  );
  requireStatus(anonRead, [200], "anon 초안 조회");
  if (JSON.parse(anonRead.text).length !== 0) {
    throw new Error("anon에게 복구 훈련용 초안이 노출됐습니다.");
  }

  const adminRead = await request(
    `/rest/v1/photos?id=eq.${encodeURIComponent(probeId)}&select=id`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  requireStatus(adminRead, [200], "관리자 초안 조회");
  if (JSON.parse(adminRead.text).length !== 1) {
    throw new Error("관리자가 복구 훈련용 초안을 읽지 못했습니다.");
  }
  console.log("관리자 DB 쓰기·읽기와 anon 초안 차단 확인");

  const sortRpc = await request("/rest/v1/rpc/update_photos_sort_orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items: [{ id: probeId, sort_order: 7 }] }),
  });
  requireStatus(sortRpc, [200], "관리자 정렬 RPC");
  if (JSON.parse(sortRpc.text) !== 1) {
    throw new Error(`정렬 RPC 갱신 행 수가 1이 아닙니다: ${sortRpc.text}`);
  }
  console.log("관리자 정렬 RPC 확인");

  const onePixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  const upload = await request(`/storage/v1/object/media/${storagePath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "image/png",
    },
    body: onePixelPng,
  });
  requireStatus(upload, [200, 201], "관리자 Storage 업로드");
  storageProbeCreated = true;

  const publicObject = await request(
    `/storage/v1/object/public/media/${storagePath}`,
  );
  requireStatus(publicObject, [200], "공개 Storage 읽기");
  console.log("관리자 Storage 쓰기와 공개 읽기 확인");
} finally {
  if (storageProbeCreated) {
    const removeStorage = await request(
      `/storage/v1/object/media/${storagePath}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    requireStatus(removeStorage, [200], "Storage probe 삭제");
  }
  if (dbProbeCreated) {
    const removeDb = await request(
      `/rest/v1/photos?id=eq.${encodeURIComponent(probeId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: "return=minimal",
        },
      },
    );
    requireStatus(removeDb, [204], "DB probe 삭제");
  }
}

console.log("복원된 Supabase Auth·RLS·RPC·Storage 검증 성공");
