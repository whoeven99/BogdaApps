# DESIGN.md

## Purpose

This document defines the visual language for Bundle V2.
It is written for AI coding agents and developers who will build or update UI in this repository.

This is not a marketing-site design brief.
This is a product UI system for a Shopify embedded app with a related storefront theme extension.

## Product Context

- Product type: Shopify embedded app for bundle offers, analytics, and storefront merchandising
- Primary environment: Shopify Admin
- Secondary environment: Shopify storefront theme extension
- Main user mindset: operational, task-focused, configuration-heavy
- Design goal: feel trustworthy, efficient, modern, and easy to scan

## Core Personality

The product should feel:

- Calm, not loud
- Precise, not decorative
- Friendly, not playful
- Branded, but not over-styled
- Modern SaaS, but still native enough for the Shopify admin ecosystem

Preferred inspiration:

- Linear: density, hierarchy, and precision
- Vercel: restraint and clarity
- Supabase: green-accented brand confidence

Do not mimic any external brand literally.
Use these references only as tonal guides.

## Tech Reality

Generate UI that matches the actual repository:

- Framework: React 18 + React Router
- Styling: Tailwind CSS for layout, spacing, and quick composition
- Components: Ant Design for form controls, feedback, and common app UI
- Custom CSS: allowed for complex previews, multistep builders, and storefront extension styling
- Host environment: Shopify embedded app shell

Do not assume this project uses a pure design system package, pure Tailwind approach, or official Polaris React components everywhere.
Design decisions must fit the existing mixed stack.

## Design Principles

1. Optimize for task completion.
2. Prefer compact layouts over explanatory copy.
3. Keep dense screens readable through spacing and hierarchy.
4. Use brand color with intention, not everywhere.
5. Favor stable patterns over visual novelty.
6. Preserve compatibility with Shopify admin expectations.

## Visual Tokens

These values define the default visual language.
Reuse them consistently across pages, custom CSS, and component styling.

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
- Featured tint: `#f5fff9`
- Critical: `#d72c0d`
- Warning: `#b98900`

### Radius

- Small controls: `6px`
- Standard cards and inputs: `8px`
- Featured cards or premium blocks: `12px`

### Shadow

- Default card shadow: subtle only
- Featured card shadow: slightly stronger but still soft
- Never use dramatic glow, glassmorphism, or heavy layered shadows

### Typography

- System sans stack is acceptable
- Prioritize legibility over stylistic typography
- Headings should feel compact and strong
- Body copy should stay clean and neutral
- Helper text should be optional, not default
- Prefer one clear label over a label plus explanatory sentence

Recommended hierarchy:

- Page title: `22px` to `28px`, semibold
- Section title: `18px` to `20px`, semibold
- Card title: `14px` to `16px`, semibold
- Body text: `14px`
- Secondary text: `12px` to `13px`

## Layout Rules

### App Pages

- Prefer white surface cards on a soft neutral page background
- Use clear section spacing instead of large decorative panels
- Keep width practical for admin workflows
- Avoid oversized hero sections or landing-page composition
- Keep page headers short; title plus actions is preferred
- Avoid eyebrow labels unless they add real navigation value

### Complex Builder Pages

For multistep configuration pages like offer creation:

- Prefer a two-column layout on desktop
- Left column: controls, form sections, and configuration logic
- Right column: sticky preview or contextual summary
- Collapse to one column on smaller screens
- Use a persistent bottom action area only when forms are long enough to justify it
- Step navigation must stay compact and should not push form content below the fold

### Cards

Card states should be visually consistent:

- Default: white background, light border
- Selected: stronger border, minimal emphasis
- Featured: green border or green-tinted background
- Read-only: same structure, lower interactivity cues

Avoid inventing different card languages on each page.

## Components

### Buttons

- Primary button uses the brand green
- Secondary button is quiet and supportive
- Plain button is text-like and used for lower-priority actions
- Any dark-filled button must use white text for inverse contrast
- Destructive actions must use critical styling, never brand green
- Do not create multiple competing primary actions in one area

### Inputs

- Labels sit above fields
- Helper text sits below fields
- Error text is short, direct, and visible
- Input styling should remain simple and stable
- Avoid decorative field chrome

### Steps

- Steps should be compact, readable, and clearly state progress
- Active step uses the brand color
- Inactive steps use muted backgrounds and subdued text
- Step components should feel utilitarian, not celebratory
- Do not add paragraph-length explanations inside each step item

### Tables and Lists

- Favor clean rows, clear spacing, and restrained borders
- Use visual emphasis for important status or actions, not for every cell
- Keep actions aligned and predictable
- Avoid dense visual noise or unnecessary badges

### Empty States

- Be concise
- Explain what the user can do next
- Prefer one primary CTA
- Do not over-illustrate
- Avoid multi-line product education in empty states

### Alerts and Status

- Success uses green accents sparingly
- Warning uses amber or muted emphasis
- Critical uses red and must be unambiguous
- Informational notices should stay low-drama and practical

## Page Archetypes

All new pages should fit one of these patterns before introducing a new layout style.

### Dashboard

- High-level status
- Important recommendations
- Fast access to next actions
- Light data density

### List / Management Page

- Search, filter, sort, and quick actions
- Data-first composition
- Stable table or list rhythm

### Builder / Configuration Page

- Step-based flow
- Sectioned inputs
- Sticky preview or summary
- Strong save/publish affordances

### Analytics Page

- Clear summary first
- Visualizations should support decisions, not become decoration
- Use restrained chart styling

### Pricing Page

- Clear plan comparison
- Trustworthy and simple
- Avoid a separate visual language from the rest of the app

## Storefront Extension Rules

The storefront extension is related to the app, but it is not the same surface.

- Keep it lighter and less admin-like
- Preserve compatibility with many Shopify themes
- Reuse core color and card logic where reasonable
- Keep storefront UI compact and easy to embed near product forms
- Do not force heavy app-shell styling into storefront blocks

When a preview exists in admin, it should feel directionally consistent with storefront output.
The preview does not need to be pixel-identical, but it should not feel like a different product.

## Motion

- Motion should be minimal and purposeful
- Prefer quick fades, subtle hover changes, and lightweight transitions
- Avoid dramatic entrance animations
- Avoid motion that slows down form-heavy workflows

## Content Style

- Use short, direct labels
- Prefer operational language over marketing language
- Make actions explicit
- Keep helper text useful, compact, and sparse
- Avoid vague slogans inside product UI
- Avoid repeating the same explanation in page header, section header, and preview panel

## Accessibility

- Maintain clear contrast between text, borders, and surfaces
- Do not rely on color alone to indicate state
- Keep interactive targets comfortable to use
- Preserve keyboard and form usability
- Ensure selected, featured, and error states are distinguishable

## Implementation Guidance

When generating code for this repository:

- Prefer Ant Design components for common controls and feedback
- Prefer Tailwind for layout, spacing, alignment, and page composition
- Use custom CSS only when utility classes become hard to manage or when storefront preview fidelity matters
- Reuse existing visual patterns before inventing new ones
- Keep brand green as the primary accent throughout the app

Before adding new visual patterns, check whether an existing page already solves the same problem.

## Anti-Patterns

Do not generate UI that looks like:

- A flashy AI landing page
- A neon cyberpunk dashboard
- A heavy dark-mode-only interface
- A glassmorphism experiment
- A gradient-saturated startup hero
- A playful consumer app

Do not:

- Introduce another primary component library
- Mix unrelated design languages on the same page
- Overuse arbitrary values when existing patterns are enough
- Create oversized empty space without functional purpose
- Use large decorative icons where simple hierarchy works better
- Make pricing or analytics feel disconnected from the rest of the app

## Decision Rule

If a design choice is unclear, choose the option that is:

1. more readable,
2. more consistent with existing app structure,
3. more compatible with Shopify admin expectations,
4. easier to maintain in `Ant Design + Tailwind + custom CSS`,
5. less visually noisy.
