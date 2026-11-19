import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = () => readFileSync(join(root, "app/routes/app.pricing/style.css"), "utf8");
const route = () => readFileSync(join(root, "app/routes/app.pricing/route.tsx"), "utf8");
const card = () =>
  readFileSync(
    join(root, "app/routes/app.pricing/components/AccountTranslationsCard.tsx"),
    "utf8",
  );

test("pricing CSS has TSF shell geometry classes", () => {
  const text = css();
  assert.match(text, /\.pricing-section\s*\{[^}]*border-radius:\s*24px/s);
  assert.match(text, /\.pricing-usage-card\s*\{[^}]*border-radius:\s*20px/s);
  assert.match(text, /\.pricing-plan-card--recommended/);
  assert.match(text, /\.pricing-plan-card__hero/);
  assert.match(text, /\.pricing-comparison-table/);
  assert.match(text, /\.pricing-comparison-scroll-hint/);
});

test("pricing route wraps plans row and compare/faq in sections", () => {
  const text = route();
  assert.match(text, /id="pricing-plans"/);
  const plansStart = text.indexOf('id="pricing-plans"');
  const plansSection = text.slice(plansStart, text.indexOf("</section>", plansStart));
  assert.match(plansSection, /<Row[\s\S]*gutter=\{\[16, 16\]\}/);
  assert.match(text, /pricing-section pricing-section--compact/);
  assert.match(text, /pricing-comparison-scroll-hint/);
  assert.match(text, /pricing\.compare\.scrollHint/);
  assert.match(text, /scroll=\{\{\s*x:\s*comparisonTableScrollX\s*\}\}/);
  assert.equal(text.includes('className="pricing-compare-title"'), false);
  assert.equal(text.includes('className="pricing-faq-title"'), false);
});

test("usage card uses header/content/balance/actions", () => {
  const text = card();
  assert.match(text, /pricing-usage-card__header/);
  assert.match(text, /pricing-usage-card__content/);
  assert.match(text, /pricing-usage-card__balance/);
  assert.match(text, /pricing-usage-card__actions/);
});
