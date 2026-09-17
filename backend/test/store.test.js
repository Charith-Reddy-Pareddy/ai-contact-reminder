import { test } from "node:test";
import assert from "node:assert/strict";

test("store.js uses the file backend when DATABASE_URL is unset", async () => {
  delete process.env.DATABASE_URL;
  const store = await import(`../utils/store.js?t=${Date.now()}-a`);
  const fileStore = await import("../utils/fileStore.js");

  assert.equal(store.readContacts, fileStore.readContacts);
});

test("store.js uses the Postgres backend when DATABASE_URL is set", async () => {
  process.env.DATABASE_URL = "postgres://user@localhost:5432/test";
  const store = await import(`../utils/store.js?t=${Date.now()}-b`);
  const pgStore = await import("../utils/pgStore.js");

  assert.equal(store.readContacts, pgStore.readContacts);
  delete process.env.DATABASE_URL;
});
