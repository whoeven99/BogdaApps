# DESIGN.md

## Purpose

This file defines the UI rules for Bundle V2.
It is for coding agents and developers working on this repository.

This is a Shopify embedded app.
Design for Shopify Admin first, not for a marketing site.

## Product Context

- Product: bundle offers, analytics, pricing, and storefront merchandising
- Primary surface: Shopify Admin
- Secondary surface: storefront theme extension
- User mindset: task-focused, operational, configuration-heavy

## Core Direction

- Feel native to Shopify Admin
- Feel calm, clear, and compact
- Keep brand expression subtle
- Prioritize scanning and task completion
- Prefer practical structure over decorative styling

## Hard Rules

- Do not use eyebrow labels by default
- Do not place descriptive paragraphs under page titles by default
- Do not place descriptive paragraphs under section titles by default
- Do not place descriptive paragraphs under card titles by default
- Do not create stacked title + subtitle + helper text unless the user explicitly needs onboarding
- If a heading is unclear, rename the heading instead of adding a sentence below it
- If guidance is necessary, place it next to the exact field, state, or action that needs explanation
- Default to compact layouts and compact navigation
- Match Shopify Admin hierarchy before adding brand styling

## Shopify Alignment

Use Shopify Admin and Polaris principles as the baseline:

- Clear page hierarchy
- Compact, readable spacing
- White surfaces and restrained borders
- Calm status treatment
- Minimal visual drama
- Action-first page structure

If a UI choice feels louder than Shopify Admin, it is probably wrong.

## Tech Reality

Generate UI that fits this repository:

- React 18 + React Router
- Tailwind for layout and spacing
- Ant Design for common controls and feedback
- Custom CSS only for complex builders, previews, and storefront extension styling

Do not assume pure Polaris or pure Tailwind.
Design choices must work with the current mixed stack.

## Visual Tokens

### Colors

- Primary: `#008060`
- Primary hover: `#006e52`
- Primary active: `#005c43`
- Surface: `#ffffff`
- Surface subtle: `#f6f6f7`
- Surface muted: `#f4f6f8`
- Border default: `#dfe3e8`
- Border strong: `#c9ccd0`
- Text primary: `#202223`
- Text secondary: `#1c1f23`
- Text subdued: `#6d7175`
- Success tint: `#f0faf6`
- Critical: `#d72c0d`
- Warning: `#b98900`

Rules:

- Most text uses neutral dark colors
- Green is for primary action or positive state, not general decoration
- Red is only for destructive or critical states
- Warning colors are for caution only
- Never rely on color alone to convey meaning

### Radius

- Small controls: `6px`
- Standard controls and cards: `8px`
- Featured cards: `12px`

### Shadow

- Keep shadows very light
- Avoid heavy shadows, glow, glassmorphism, and visual effects

### Typography

- Use a clean system sans stack
- Prioritize legibility over style
- Keep headings compact
- Keep support text sparse

Recommended sizes:

- Page title: `22px` to `28px`
- Section title: `18px` to `20px`
- Card title: `14px` to `16px`
- Body text: `14px`
- Secondary text: `12px` to `13px`

## Layout Rules

### Page Header

- Keep page headers short
- Preferred pattern: title on the left, actions on the right
- Do not add eyebrow + title + paragraph stacks
- Do not add marketing-style copy under titles
- If extra context is needed, use a small inline status, count, or notice
- Reduce top padding and bottom padding where possible

### Navigation

- Navigation must stay compact
- Tabs should usually fit on one row
- Avoid thick tab containers and oversized wrappers
- Prefer low-height tabs or segmented controls
- Navigation must not push main content below the fold unnecessarily

### App Pages

- Use white cards on a neutral background
- Keep widths practical for admin workflows
- Avoid hero sections and oversized empty space
- Use spacing for structure, not decorative panels
- Keep content density closer to Shopify Admin than to a SaaS landing page

### Builder Pages

- Prefer two columns on desktop
- Left: configuration
- Right: sticky preview or summary
- Collapse to one column on smaller screens
- Step navigation must be compact
- Use a sticky bottom action bar only when necessary
- In dense sections, headings plus spacing are often enough; do not wrap every group in another bordered card

### Cards

- Default: white background, light border
- Selected: stronger border, minimal emphasis
- Featured: subtle green emphasis only
- Read-only: same structure, lower interaction cues
- Card titles should be short
- Do not put descriptive body copy under card titles unless the card is an empty state, warning, or destructive action

## Components

### Buttons

- One clear primary action per area
- Primary button may use the app green
- Secondary buttons should be quiet
- Plain buttons should feel lightweight
- Any dark-filled button must use white text
- Destructive actions use critical styling, not brand green

### Inputs

- Labels sit above fields
- Helper text is optional, not default
- Error text is short and direct
- Keep fields visually simple

### Steps

- Steps must be compact
- Each step should have a short title
- Do not add paragraph descriptions inside step items
- Active state may use the brand color
- Inactive state should stay muted

### Tables and Lists

- Keep rows clean and predictable
- Use emphasis only where it changes action or state
- Avoid too many badges, icons, or inline labels

### Alerts and Notices

- Use notices only when action or awareness is truly needed
- Keep notice text short
- Avoid turning every page into stacked banners
- Informational notices should stay low-drama

### Empty States

- Be concise
- State what is missing
- State the next action
- Prefer one primary CTA

## Content Rules

- Use short, direct labels
- Prefer operational language
- Remove filler text
- Avoid repeating the same explanation in multiple places
- Do not restate the title in the description below it
- Do not explain obvious sections
- Prefer inline metadata over explanatory paragraphs

Default behavior:

- No eyebrow
- No subtitle under title
- No description under section header
- No description under card header

Allowed exceptions:

- Empty states
- Warnings and critical notices
- Risky actions
- Complex fields that cannot be understood from the label alone

## Page Archetypes

### Dashboard

- Summary first
- Fast actions second
- Light to medium density

### List Page

- Filters and actions first
- Data-first layout
- Stable table rhythm

### Builder Page

- Step flow
- Compact sectioning
- Sticky preview or summary
- Strong save or publish action

### Analytics Page

- Summary first
- Charts support decisions
- Avoid decorative charts

### Pricing Page

- Clear plan comparison
- Simple and trustworthy
- Must not look like a different product

## Storefront Extension

- Keep it lighter than the admin
- Preserve compatibility with many Shopify themes
- Reuse color and card logic where useful
- Do not force admin shell styling into storefront blocks

Admin preview should feel close in intent to storefront output, but does not need to be pixel-identical.

## Motion

- Keep motion minimal
- Prefer subtle hover and quick transitions
- Avoid dramatic entrances
- Avoid motion that slows down workflows

## Accessibility

- Maintain strong text and surface contrast
- Do not rely on color alone
- Keep controls easy to target
- Preserve keyboard usability

## Implementation Guidance

- Prefer Ant Design for controls and feedback
- Prefer Tailwind for layout and spacing
- Use custom CSS only when necessary
- Reuse existing patterns before creating new ones
- Tune Ant Design toward Shopify Admin tone through spacing, borders, radius, and color restraint

## Anti-Patterns

Do not create UI that looks like:

- a landing page
- a flashy startup dashboard
- a neon or heavy dark interface
- a glassmorphism experiment
- a gradient-first branded microsite

Do not:

- introduce another primary component library
- add eyebrow labels everywhere
- add title-description stacks by default
- create oversized navigation blocks
- create oversized empty space without function
- overuse color, badges, or decorative icons
- let pricing or analytics drift into a separate visual language

## Decision Rule

If a choice is unclear, choose the option that is:

1. more compact,
2. more readable,
3. closer to Shopify Admin,
4. easier to maintain in this repository,
5. less visually noisy.
