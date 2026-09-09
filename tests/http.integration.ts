import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { workspaceKey } from "../src/infrastructure/workspace-token";
import { workspaces } from "../src/infrastructure/database/schema";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

test("production HTTP actions persist metadata, isolate cookies and reject cross-origin writes", async () => {
  assert.ok(
    process.env.TEST_DATABASE_URL,
    "Provide the direct URL of the database used by the local production server.",
  );
  const origin = process.env.TEST_BASE_URL ?? "http://localhost:3112";
  assert.ok(/^http:\/\/localhost:\d+$/.test(origin), "HTTP checks are localhost-only.");
  const manifest = JSON.parse(
    readFileSync(".next/server/server-reference-manifest.json", "utf8"),
  ) as { node: Record<string, { exportedName: string }> };
  function actionId(name: string) {
    const entry = Object.entries(manifest.node).find(
      ([, value]) => value.exportedName === name,
    );
    assert.ok(entry, `Build must expose ${name}.`);
    return entry[0];
  }
  async function call(
    name: string,
    args: unknown[],
    cookie = "",
    requestOrigin = origin,
  ) {
    return fetch(origin, {
      method: "POST",
      headers: {
        "Next-Action": actionId(name),
        "Content-Type": "text/plain;charset=UTF-8",
        Origin: requestOrigin,
        Cookie: cookie,
      },
      body: JSON.stringify(args),
    });
  }
  async function result(
    response: Response,
  ): Promise<{
    ok: boolean;
    data: { id: string; title: string }[] | { id: string; title: string };
  }> {
    assert.equal(response.status, 200);
    const line = (await response.text())
      .split("\n")
      .find((item) => item.startsWith("1:"));
    assert.ok(line, "Expected a serialized Server Action result.");
    return JSON.parse(line.slice(2));
  }
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL,
    max: 1,
  });
  const db = drizzle(pool);
  const keys: string[] = [];
  try {
    const health = await fetch(`${origin}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok", storage: "ready" });
    const first = await call("loadSurveysAction", []);
    const header = first.headers.get("set-cookie") ?? "";
    const cookie = header.split(";")[0];
    keys.push(workspaceKey(cookie.split("=")[1]));
    assert.ok(
      /httponly/i.test(header) &&
        /secure/i.test(header) &&
        /samesite=strict/i.test(header),
      "Workspace cookie must be HttpOnly, Secure and SameSite=Strict in production.",
    );
    assert.equal((await result(first)).ok, true);
    const input = {
      title: "HTTP saved survey",
      description: "A harmless HTTP integration survey.",
      eligibility: "Test participants",
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2030-01-01T00:00:00.000Z",
    };
    const saved = await result(
      await call("createSurveyAction", [input], cookie),
    );
    assert.equal(saved.ok, true);
    assert.ok(!Array.isArray(saved.data));
    const id = saved.data.id;
    const reloaded = await result(await call("loadSurveysAction", [], cookie));
    assert.ok(Array.isArray(reloaded.data));
    assert.ok(reloaded.data.some((survey) => survey.id === id));
    const second = await call("loadSurveysAction", []);
    const otherCookie = (second.headers.get("set-cookie") ?? "").split(";")[0];
    keys.push(workspaceKey(otherCookie.split("=")[1]));
    const isolated = await result(second);
    assert.ok(Array.isArray(isolated.data));
    assert.equal(
      isolated.data.some((survey) => survey.id === id),
      false,
    );
    assert.equal((await result(await call("surveyLifecycleAction", [id, "check"], cookie))).ok, true);
    assert.equal((await result(await call("surveyLifecycleAction", [id, "close"], otherCookie))).ok, false);
    assert.equal((await result(await call("surveyLifecycleAction", [id, "close"]))).ok, false);
    assert.equal((await result(await call("surveyLifecycleAction", [id, "edit", input], cookie))).ok, false);
    assert.equal((await result(await call("surveyLifecycleAction", [id, "close"], cookie))).ok, true);
    assert.equal((await result(await call("surveyLifecycleAction", [id, "check"], cookie))).ok, false, "A stale participant must not pass the current persisted lifecycle.");
    assert.equal((await result(await call("surveyLifecycleAction", [id, "close"], cookie))).ok, false);
    assert.equal((await result(await call("surveyLifecycleAction", [id, "check", { response: "private" }], cookie))).ok, false);
    const future = { ...input, startsAt: "2098-01-01T00:00:00.000Z", endsAt: "2099-01-01T00:00:00.000Z" };
    const scheduled = await result(await call("createSurveyAction", [future], cookie));
    assert.equal(scheduled.ok, true);
    assert.ok(!Array.isArray(scheduled.data));
    const scheduledId = scheduled.data.id;
    const edited = await result(await call("surveyLifecycleAction", [scheduledId, "edit", { ...future, title: "HTTP edited survey" }], cookie));
    assert.equal(edited.ok, true);
    assert.ok(!Array.isArray(edited.data));
    assert.equal(edited.data.title, "HTTP edited survey");
    assert.equal((await result(await call("surveyLifecycleAction", [scheduledId, "edit", future], otherCookie))).ok, false);
    assert.equal((await result(await call("surveyLifecycleAction", [scheduledId, "close"], cookie))).ok, false);
    assert.equal((await result(await call("surveyLifecycleAction", [scheduledId, "edit", input], cookie))).ok, false);
    assert.equal((await result(await call("surveyLifecycleAction", [scheduledId, "edit", { ...future, closedAt: null }], cookie))).ok, false);
    assert.equal((await result(await call("surveyLifecycleAction", [scheduledId, "delete"], cookie))).ok, false);
    assert.equal(
      (await result(await call("createSurveyAction", [input]))).ok,
      false,
    );
    assert.equal(
      (
        await result(
          await call(
            "createSurveyAction",
            [{ ...input, response: "Do not store" }],
            cookie,
          ),
        )
      ).ok,
      false,
    );
    const crossOrigin = await call(
      "createSurveyAction",
      [input],
      cookie,
      "https://untrusted.example",
    );
    assert.ok(
      crossOrigin.status >= 400,
      "Cross-origin write must be rejected.",
    );
    await crossOrigin.text();
    const oversized = await call(
      "createSurveyAction",
      [{ ...input, description: "x".repeat(40000) }],
      cookie,
    );
    // Next serializes the payload-limit failure as a production action error (500).
    assert.ok(
      oversized.status >= 400,
      "Server Actions must reject requests above the 32 KB body limit.",
    );
    await oversized.text();
    const after = await result(await call("loadSurveysAction", [], cookie));
    assert.ok(Array.isArray(after.data));
    assert.equal(after.data.length, 6);
    assert.equal(after.data.find((survey) => survey.id === scheduledId)?.title, "HTTP edited survey");
  } finally {
    try {
      if (keys.length)
        await db.delete(workspaces).where(inArray(workspaces.id, keys));
    } finally {
      await pool.end();
    }
  }
});
