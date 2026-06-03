# Semantic Workflow

## Purpose

Use this workflow whenever a task touches offer semantics, campaign modules,
discount logic, storefront rendering, metafield sync, or Shopify Functions.

The goal is to make every meaningful question or change traceable to a concrete
todo item, then solve that todo against the shared semantics in
`OFFER_SEMANTICS.md`.

## Core Rule

Every offer-related change starts from a semantic todo.

A semantic todo can come from:

- a user question
- a bug
- a confusing behavior in the builder or storefront
- a planned feature
- a mismatch between UI, saved payload, metafields, theme extension, and
  Shopify Functions

If the task is small, the todo can be a short checklist item in the working
notes for that change. If it affects product behavior or future architecture,
add it to `DEVELOPMENT_PLAN.md` or `NextTodo.md`.

## Workflow

1. Identify the semantic question.

   State what needs to be decided or changed in domain terms.

   Examples:

   - Should free gift compete with product discounts?
   - Should complete bundle be product discount or order discount?
   - Does this module belong in a quantity bar or in its own storefront block?

2. Link it to the semantic source.

   Read `OFFER_SEMANTICS.md` and identify the relevant sections:

   - Campaign
   - Module
   - Product Discount
   - Order Discount
   - Module Semantics
   - Runtime Compilation

   If the document does not answer the question, update the semantic document
   before or alongside implementation.

3. Create or update a todo.

   The todo should include:

   - a short ID or title
   - semantic decision or assumption
   - affected modules
   - affected runtime paths
   - acceptance criteria
   - validation plan

4. Scope the implementation.

   Decide which layers are touched:

   - builder state
   - campaign config
   - legacy-field compilation
   - metafield payload
   - theme extension
   - cart discount Function
   - delivery discount Function
   - preview/list display

5. Implement against the semantic todo.

   Keep the patch focused on the todo. Avoid broad cleanup unless it directly
   reduces semantic drift.

6. Validate the loop.

   Choose the smallest useful validation set:

   - TypeScript check for schema or TypeScript changes
   - lint for frontend/server logic
   - local preview/browser check for UI or storefront changes
   - Function build/deploy awareness for Shopify Function changes
   - saved payload inspection when changing campaign config or legacy fields

7. Close or revise the todo.

   Update the todo status, add follow-up tasks if the implementation exposed a
   new semantic question, and keep `OFFER_SEMANTICS.md` current.

## Todo Template

Use this shape for new semantic todos:

```md
### ID - Title

Status: Planned | In progress | Done | Blocked

Semantic anchor:
- Reference the relevant section in `OFFER_SEMANTICS.md`.

Question or change:
- State the domain behavior being decided or changed.

Affected modules:
- List campaign modules or discount classes.

Affected code paths:
- Builder:
- Campaign/legacy compilation:
- Storefront/theme:
- Shopify Functions:
- Metafields:

Acceptance:
- Observable outcome 1
- Observable outcome 2

Validation:
- Check 1
- Check 2
```

## Decision Rules

When there is uncertainty, prefer the option that:

1. matches `OFFER_SEMANTICS.md`
2. preserves Shopify discount-class behavior
3. keeps product discounts competing by maximum discount
4. keeps order rewards separate from product discounts
5. keeps storefront modules independently composable
6. minimizes legacy-field drift while legacy runtime paths still exist

## Current Semantic Priorities

Use these priorities when choosing the next todo:

1. Remove product-discount short-circuit behavior in the cart Function.
2. Keep complete bundle as a bundle-total module, executed through targeted product discount candidates, and remove BXGY dependency.
3. Reframe free gift as an order reward module.
4. Treat `offerType` as a template or primary module, not the whole campaign.
5. Build toward a campaign-to-runtime compiler.
6. Leave shipping discount outside the main campaign rewrite until intentionally
   designed.
