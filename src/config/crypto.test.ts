import assert from "node:assert/strict";
import test from "node:test";
import {
  ConfigSecretError,
  decryptJson,
  encryptJson,
  generateToken,
  isConfigSecretConfigured,
} from "./crypto.js";

test("encryptJson round-trips through decryptJson", () => {
  process.env.CONFIG_SECRET = "test-secret-please-ignore";

  const payload = { username: "user@example.com", password: "hunter2" };
  const encrypted = encryptJson(payload);

  assert.notEqual(encrypted.secret, JSON.stringify(payload));
  assert.ok(encrypted.iv.length > 0);
  assert.ok(encrypted.authTag.length > 0);

  const decrypted = decryptJson<typeof payload>(encrypted);
  assert.deepEqual(decrypted, payload);
});

test("decryptJson fails when the secret changes", () => {
  process.env.CONFIG_SECRET = "first-secret";
  const encrypted = encryptJson({ a: 1 });

  process.env.CONFIG_SECRET = "different-secret";
  assert.throws(() => decryptJson(encrypted));

  process.env.CONFIG_SECRET = "first-secret";
});

test("crypto requires CONFIG_SECRET", () => {
  delete process.env.CONFIG_SECRET;
  assert.equal(isConfigSecretConfigured(), false);
  assert.throws(() => encryptJson({ a: 1 }), ConfigSecretError);

  process.env.CONFIG_SECRET = "restore";
});

test("generateToken produces unique url-safe tokens", () => {
  const a = generateToken();
  const b = generateToken();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]+$/);
});
