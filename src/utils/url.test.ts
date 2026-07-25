import assert from "node:assert/strict";
import test from "node:test";
import {
  encodeConfigSegment,
  installLinksForToken,
  publicBaseUrl,
} from "./url.js";

test("encodeConfigSegment produces a single decodable segment", () => {
  const segment = encodeConfigSegment({ t: "abc123" });
  assert.equal(segment.includes("/"), false);
  assert.deepEqual(JSON.parse(decodeURIComponent(segment)), { t: "abc123" });
});

test("installLinksForToken builds manifest and stremio deep link", () => {
  process.env.ADDON_PUBLIC_URL = "https://addon.example.com";
  const { manifestUrl, installUrl } = installLinksForToken("tok_123");

  const segment = encodeConfigSegment({ t: "tok_123" });
  assert.equal(
    manifestUrl,
    `https://addon.example.com/${segment}/manifest.json`,
  );
  assert.equal(
    installUrl,
    `stremio://addon.example.com/${segment}/manifest.json`,
  );

  delete process.env.ADDON_PUBLIC_URL;
});

test("publicBaseUrl falls back to loopback with PORT", () => {
  delete process.env.ADDON_PUBLIC_URL;
  process.env.PORT = "7123";
  assert.equal(publicBaseUrl(), "http://127.0.0.1:7123");
  delete process.env.PORT;
});
