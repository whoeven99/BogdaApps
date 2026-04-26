# AGENTS.md

## Purpose

This file tells coding agents how to work safely and effectively in this repository.
Read this file before making code changes.
For visual and UI decisions, read `DESIGN.md` first and follow it unless the user explicitly asks for something else.

## Project Summary

- Product: Shopify embedded app for bundle offers, pricing, analytics, and storefront merchandising
- Frontend: React 18 + React Router + TypeScript
- Styling: Tailwind CSS + Ant Design + targeted custom CSS
- Backend: Shopify app server with Prisma
- Extensions:
  - Shopify Functions in `extensions/`
  - Theme extension in `extensions/bundle-theme-product-custom/`
  - Web pixel extension in `extensions/ciwi-bundle-web-pixer/`

## Key Entry Points

- App shell: `app/root.tsx`
- Embedded app layout: `app/routes/app.tsx`
- Main business UI: `app/routes/_index/route.tsx`
- Core pages:
  - `app/routes/page/DashboardPage.tsx`
  - `app/routes/page/AllOffersPage.tsx`
  - `app/routes/page/AnalyticsPage.tsx`
  - `app/routes/page/PricingPage.tsx`
- Core builder:
  - `app/routes/component/CreateNewOffer/CreateNewOffer.tsx`
  - `app/routes/component/CreateNewOffer/CreateNewOffer.css`
- Storefront theme extension:
  - `extensions/bundle-theme-product-custom/assets/product-detail-message.css`
  - `extensions/bundle-theme-product-custom/assets/product-detail-message.js`

## Workflow Expectations

1. Read relevant files before editing.
2. Reuse existing patterns before adding new abstractions.
3. Keep UI changes aligned with `DESIGN.md`.
4. Prefer focused changes over broad refactors unless requested.
5. After substantive edits, run appropriate checks.

## UI Rules

- Follow `DESIGN.md` for page structure, token usage, and component tone.
- Prefer Ant Design for common controls, feedback, modal, table, and form primitives.
- Prefer Tailwind for layout, spacing, and page composition.
- Use custom CSS only when the UI is too complex for utility classes or when storefront preview fidelity matters.
- Do not introduce a new primary UI component library.
- Do not mix multiple unrelated visual styles on the same page.
- Keep Shopify admin surfaces calm, dense, and task-oriented.

## Existing UI Patterns

- Brand green is the main accent color.
- Builder pages commonly use a left configuration column and right sticky preview.
- Theme extension preview and admin preview should feel directionally consistent.
- Pricing should not drift into a separate visual language from the rest of the app.

## Routing Notes

- The main app experience is mostly controlled from `app/routes/_index/route.tsx`.
- Major sections are often switched by internal tab state rather than by creating many separate routes.
- Do not assume each main view should become a new URL unless the user asks for routing changes.

## Shopify-Specific Rules

- App-specific webhooks are mapped by topic to dedicated route files. There is no generic `/webhooks` catch-all entry.
- If you change Shopify Function code under `extensions/`, remember that shipping web app code is not enough. Function changes require `npm run deploy` to push updated WebAssembly to Shopify.
- When debugging Shopify Functions, use `console.error`, not `console.log`, so logs appear correctly without corrupting function output.
- If the app is reinstalled, app-owned Shopify metafields may need to be re-synced during initialization because uninstall clears them from Shopify.
- When working on market data queries, verify required Shopify access scopes before assuming the data is available.

## Environment Notes

- This project supports isolated `prod` and `test` bundle environments. Local development often resolves to `test` unless environment variables explicitly select production behavior.
- If the hosted test environment appears to have missing offers, verify whether data was written to test metafields rather than prod metafields.
- Production database selection must respect `NODE_ENV === "production"`; be careful when changing server environment detection logic.

## Data And Metafield Notes

- Bundle discount configuration is stored in shop-level metafields, not product-level metafields for the current app behavior.
- If you inspect discount recreation logic, make sure active discount filtering excludes deleted or inactive nodes.

## Frontend Implementation Notes

- Global CSS such as Ant Design reset belongs in `app/root.tsx`, not in child routes.
- If you need the Shopify product picker, prefer the App Bridge v4 `window.shopify.resourcePicker(...)` flow already aligned with this project.
- For lucide-react icons, use current icon names. `HelpCircle` is obsolete; use `CircleHelp` instead if needed.
- When showing route-level errors, expose enough detail for debugging instead of relying on a generic application error screen only.

## Builder And Preview Notes

- `CreateNewOffer` is one of the most complex UI surfaces in the app. Treat it as a reference pattern for multistep builder work.
- Keep preview data consistent across steps. Do not let preview components silently fall back to hardcoded defaults when state exists.
- Admin preview and storefront rendering share style intent. Reuse the existing style language before inventing new card or selection states.

## Backend Safety Notes

- Be careful with loader and action code that touches Shopify APIs, DB calls, or theme settings parsing.
- Theme `settings_data.json` may contain comments, so parsing logic must remain defensive.
- Wrap unstable external reads in safe error handling when a failure should not crash the whole page.
- If Prisma schema changes, create and deploy migrations. Missing migrations can cause runtime 500 errors in production.

## Commands

Use these repository scripts where relevant:

- Dev server: `npm run dev`
- Build app: `npm run build`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Deploy Shopify app and extensions: `npm run deploy`
- Prisma studio: `npm run run-localdb`
- Local migration during development: `npm run update-localdb`

## Validation Checklist

After making changes, choose the smallest sensible validation set:

- Run `npm run typecheck` for TypeScript-affecting changes
- Run `npm run lint` for frontend or server logic changes where lint coverage matters
- Check edited files for diagnostics
- If changing Shopify Functions, confirm whether a deployment step is required
- If changing UI, verify visual consistency with `DESIGN.md`

## Change Strategy

- Preserve existing architecture unless the user requests a redesign.
- Prefer small, understandable patches.
- Avoid renaming or moving large structures without clear value.
- Do not rewrite working Shopify integration code casually.
- Be especially cautious in theme extension JavaScript because theme compatibility is fragile.

## When Unsure

If you are unsure between two implementations, choose the one that is:

1. more consistent with existing project patterns,
2. safer for Shopify embedded app behavior,
3. easier to validate locally,
4. more aligned with `DESIGN.md`,
5. less likely to break storefront compatibility.
