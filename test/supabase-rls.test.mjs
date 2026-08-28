import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { after, before, describe, it } from "node:test";

import { createClient } from "@supabase/supabase-js";

const parseStatusEnv = (source) =>
  Object.fromEntries(
    source
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator);
        const value = line.slice(separator + 1).replace(/^"|"$/g, "");
        return [key, value];
      }),
  );

const localEnv = parseStatusEnv(
  execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" }),
);
const apiUrl = localEnv.API_URL;
const publicApiKey =
  localEnv.PUBLISHABLE_KEY ?? localEnv.SUPABASE_PUBLISHABLE_KEY ?? localEnv.ANON_KEY;
const elevatedApiKey =
  localEnv.SECRET_KEY ?? localEnv.SUPABASE_SECRET_KEY ?? localEnv.SERVICE_ROLE_KEY;

assert.ok(apiUrl, "supabase status에 API_URL이 있어야 한다");
assert.ok(publicApiKey, "supabase status에 publishable 또는 로컬 호환 공개 키가 있어야 한다");
assert.ok(elevatedApiKey, "supabase status에 secret 또는 로컬 호환 관리자 키가 있어야 한다");

const clientOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
};
const service = createClient(apiUrl, elevatedApiKey, clientOptions);
const anonymous = createClient(apiUrl, publicApiKey, clientOptions);

const runId = crypto.randomUUID();
const prefix = `__rls_${runId}`;
const publicId = `${prefix}_public`;
const draftId = `${prefix}_draft`;
const anonProbeId = `${prefix}_anon`;
const nonAdminProbeId = `${prefix}_user`;
const adminProbeId = `${prefix}_admin`;
const storageSeedPath = `rls-tests/${runId}/public.webp`;
const storageAnonPath = `rls-tests/${runId}/anon.webp`;
const storageAdminPath = `rls-tests/${runId}/admin.webp`;
const password = `Rls-${runId}-aA1!`;

let adminUserId;
let nonAdminUserId;
let admin;
let nonAdmin;

const photoRow = (id, published, sortOrder = 0) => ({
  id,
  published,
  sort_order: sortOrder,
  data: { title: { ko: id, en: id } },
});

const expectRlsFailure = (error, operation) => {
  assert.ok(error, `${operation}은 RLS로 거부되어야 한다`);
  assert.ok(
    error.code === "42501" || /row-level security|permission denied/i.test(error.message),
    `${operation}의 오류가 권한 거부여야 한다: ${error.message}`,
  );
};

before(async () => {
  const seeded = await service
    .from("photos")
    .insert([photoRow(publicId, true, 0), photoRow(draftId, false, 1)]);
  assert.ifError(seeded.error);

  const uploaded = await service.storage
    .from("media")
    .upload(storageSeedPath, new Uint8Array([1]), { contentType: "image/webp" });
  assert.ifError(uploaded.error);

  const adminCreated = await service.auth.admin.createUser({
    email: `${prefix}_admin@example.test`,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
  });
  assert.ifError(adminCreated.error);
  adminUserId = adminCreated.data.user.id;

  const nonAdminCreated = await service.auth.admin.createUser({
    email: `${prefix}_user@example.test`,
    password,
    email_confirm: true,
  });
  assert.ifError(nonAdminCreated.error);
  nonAdminUserId = nonAdminCreated.data.user.id;

  admin = createClient(apiUrl, publicApiKey, clientOptions);
  nonAdmin = createClient(apiUrl, publicApiKey, clientOptions);

  const adminSignedIn = await admin.auth.signInWithPassword({
    email: `${prefix}_admin@example.test`,
    password,
  });
  assert.ifError(adminSignedIn.error);

  const nonAdminSignedIn = await nonAdmin.auth.signInWithPassword({
    email: `${prefix}_user@example.test`,
    password,
  });
  assert.ifError(nonAdminSignedIn.error);
});

after(async () => {
  await service.storage.from("media").remove([storageSeedPath, storageAnonPath, storageAdminPath]);
  await service
    .from("photos")
    .delete()
    .in("id", [publicId, draftId, anonProbeId, nonAdminProbeId, adminProbeId]);
  if (adminUserId) await service.auth.admin.deleteUser(adminUserId);
  if (nonAdminUserId) await service.auth.admin.deleteUser(nonAdminUserId);
});

describe("Postgres RLS", () => {
  it("anon은 발행 행만 읽고 초안은 볼 수 없다", async () => {
    const result = await anonymous
      .from("photos")
      .select("id,published")
      .in("id", [publicId, draftId])
      .order("id");

    assert.ifError(result.error);
    assert.deepEqual(result.data, [{ id: publicId, published: true }]);
  });

  it("anon의 insert·update·delete를 거부한다", async () => {
    const result = await anonymous.from("photos").insert(photoRow(anonProbeId, true));
    expectRlsFailure(result.error, "anon insert");

    const updated = await anonymous
      .from("photos")
      .update({ sort_order: 99 })
      .eq("id", publicId)
      .select("id");
    assert.ifError(updated.error);
    assert.deepEqual(updated.data, []);

    const deleted = await anonymous.from("photos").delete().eq("id", publicId).select("id");
    assert.ifError(deleted.error);
    assert.deepEqual(deleted.data, []);

    const unchanged = await service.from("photos").select("sort_order").eq("id", publicId).single();
    assert.ifError(unchanged.error);
    assert.equal(unchanged.data.sort_order, 0);
  });

  it("authenticated 비관리자의 읽기와 쓰기를 제한한다", async () => {
    const selected = await nonAdmin
      .from("photos")
      .select("id,published")
      .in("id", [publicId, draftId])
      .order("id");
    assert.ifError(selected.error);
    assert.deepEqual(selected.data, [{ id: publicId, published: true }]);

    const inserted = await nonAdmin.from("photos").insert(photoRow(nonAdminProbeId, true));
    expectRlsFailure(inserted.error, "non-admin insert");

    const updated = await nonAdmin
      .from("photos")
      .update({ sort_order: 99 })
      .eq("id", publicId)
      .select("id");
    assert.ifError(updated.error);
    assert.deepEqual(updated.data, []);

    const deleted = await nonAdmin.from("photos").delete().eq("id", draftId).select("id");
    assert.ifError(deleted.error);
    assert.deepEqual(deleted.data, []);
  });

  it("admin은 초안을 읽고 CRUD할 수 있다", async () => {
    const selected = await admin
      .from("photos")
      .select("id,published")
      .in("id", [publicId, draftId]);
    assert.ifError(selected.error);
    assert.equal(selected.data.length, 2);

    const inserted = await admin.from("photos").insert(photoRow(adminProbeId, false));
    assert.ifError(inserted.error);

    const updated = await admin
      .from("photos")
      .update({ published: true })
      .eq("id", adminProbeId)
      .select("published")
      .single();
    assert.ifError(updated.error);
    assert.equal(updated.data.published, true);

    const deleted = await admin.from("photos").delete().eq("id", adminProbeId);
    assert.ifError(deleted.error);
  });

  it("정렬 RPC는 anon을 거부하고 admin만 갱신한다", async () => {
    const anonResult = await anonymous.rpc("update_photos_sort_orders", {
      items: [{ id: publicId, sort_order: 10 }],
    });
    assert.ok(anonResult.error, "anon RPC는 execute 권한이 없어야 한다");

    const nonAdminResult = await nonAdmin.rpc("update_photos_sort_orders", {
      items: [{ id: publicId, sort_order: 10 }],
    });
    assert.ifError(nonAdminResult.error);
    assert.equal(nonAdminResult.data, 0);

    const adminResult = await admin.rpc("update_photos_sort_orders", {
      items: [{ id: publicId, sort_order: 10 }],
    });
    assert.ifError(adminResult.error);
    assert.equal(adminResult.data, 1);
  });
});

describe("Storage RLS", () => {
  it("공개 media 객체는 anon이 읽을 수 있다", async () => {
    const response = await fetch(
      `${apiUrl}/storage/v1/object/public/media/${encodeURI(storageSeedPath)}`,
    );
    assert.equal(response.status, 200);
    assert.equal((await response.arrayBuffer()).byteLength, 1);
  });

  it("anon 업로드는 거부한다", async () => {
    const uploaded = await anonymous.storage
      .from("media")
      .upload(storageAnonPath, new Uint8Array([2]), { contentType: "image/webp" });
    expectRlsFailure(uploaded.error, "anon storage upload");
  });

  it("admin은 media 객체를 쓰고 삭제할 수 있다", async () => {
    const uploaded = await admin.storage
      .from("media")
      .upload(storageAdminPath, new Uint8Array([3]), { contentType: "image/webp" });
    assert.ifError(uploaded.error);

    const removed = await admin.storage.from("media").remove([storageAdminPath]);
    assert.ifError(removed.error);
  });
});
