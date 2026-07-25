/**
 * Simple LRU unit tests (no DB required).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { LruCache } from "./lru.js";

test("LruCache evicts least recently used entries", () => {
  const cache = new LruCache<number>(2);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.get("a"); // refresh a
  cache.set("c", 3); // should evict b
  assert.equal(cache.get("a"), 1);
  assert.equal(cache.get("b"), undefined);
  assert.equal(cache.get("c"), 3);
});

test("LruCache clear empties all entries", () => {
  const cache = new LruCache<string>(3);
  cache.set("x", "1");
  cache.clear();
  assert.equal(cache.size, 0);
  assert.equal(cache.get("x"), undefined);
});
