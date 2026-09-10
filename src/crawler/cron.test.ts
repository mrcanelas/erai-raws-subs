import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { handleCronCrawl } from "./cron.js";

function mockRes(): Response & { statusCode: number; body: unknown } {
  const state = { statusCode: 200, body: undefined as unknown };
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      state.statusCode = code;
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      state.body = payload;
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

test("cron crawl rejects missing Authorization", async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-secret";
  try {
    const res = mockRes();
    await handleCronCrawl(
      { method: "GET", headers: {} } as Request,
      res,
    );
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { ok: false, error: "unauthorized" });
  } finally {
    if (previous === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previous;
    }
  }
});

test("cron crawl rejects when CRON_SECRET unset", async () => {
  const previous = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    const res = mockRes();
    await handleCronCrawl(
      {
        method: "GET",
        headers: { authorization: "Bearer anything" },
      } as Request,
      res,
    );
    assert.equal(res.statusCode, 401);
  } finally {
    if (previous === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previous;
    }
  }
});
