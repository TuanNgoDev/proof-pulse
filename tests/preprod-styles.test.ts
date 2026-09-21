import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../src/app/preprod/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("survey workspace opts into its scoped controls and flow styling", () => {
  assert.match(page, /className="preprod-console pulse-console"/);
  assert.match(css, /\.pulse-flow \.panel\s*\{/);
  assert.match(css, /\.pulse-console button:hover/);
  assert.doesNotMatch(page, /Lace 4\.x must be set to Midnight Preprod\./);
});
