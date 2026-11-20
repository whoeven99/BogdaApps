import assert from "node:assert/strict";
import test from "node:test";
import {
  GOOGLE_TOKEN_TIMEOUT_MS,
  fetchGoogleTokenWithRetries,
} from "../app/server/picture/geminiImage.ts";
import { ImageTranslateError } from "../app/server/picture/imageTranslateError.ts";

test("GOOGLE_TOKEN_TIMEOUT_MS is 10s", () => {
  assert.equal(GOOGLE_TOKEN_TIMEOUT_MS, 10_000);
});

test("fetchGoogleTokenWithRetries retries timeout then succeeds", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls < 3) {
      const err = new Error("connect ETIMEDOUT");
      err.code = "ETIMEDOUT";
      throw err;
    }
    return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const sleeps = [];
  const res = await fetchGoogleTokenWithRetries(
    fetchImpl,
    async (ms) => {
      sleeps.push(ms);
    },
    "https://oauth2.googleapis.com/token",
    "grant_type=x",
  );
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [2000, 2000]);
  assert.equal(res.ok, true);
});

test("fetchGoogleTokenWithRetries exhausts timeout as GEMINI_FAILED", async () => {
  const fetchImpl = async () => {
    const err = new Error("connect ETIMEDOUT");
    err.code = "ETIMEDOUT";
    throw err;
  };
  await assert.rejects(
    () =>
      fetchGoogleTokenWithRetries(
        fetchImpl,
        async () => {},
        "https://oauth2.googleapis.com/token",
        "grant_type=x",
      ),
    (err) => err instanceof ImageTranslateError && err.code === "GEMINI_FAILED",
  );
});
