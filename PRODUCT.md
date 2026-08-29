# Kauri — PRODUCT.md

## Register

**Product.** Kauri is an authenticated admin dashboard; design serves the task. (Source: CLAUDE.md — "microfinance branch management dashboard".)

## Users & Purpose

Branch managers and supervisors of savings cooperatives in Francophone West/Central Africa. They manage field agents, clients, savings goals, transactions, disbursements, TPE (payment terminal) fleets, and daily cash reconciliation. The companion mobile app (TontiPro) is used by field agents; Kauri is the manager's console. Managers work from branch offices on laptops, but also check in from tablets and phones in the field — connectivity and hardware are mid-range, so lightness and clarity matter more than spectacle.

Primary workflows: monitor branch KPIs, audit transactions, reconcile daily cash, onboard agents/clients, assign TPE devices.

## Brand & Personality

Calm, trustworthy, operational. Warm-neutral surfaces with a single warm brand accent (existing OKLCH tokens in `src/styles.css`), Inter throughout, dense-but-legible tables. UI language is **French**; currency FCFA via the `fmt()` helper.

## Anti-references

- No decorative motion, gradients-as-identity, or SaaS hero-metric styling.
- No dark-mode-by-default; ambient light in branch offices is bright.
- Nothing that increases payload or jank on mid-range hardware.

## Accessibility & Constraints

- French labels everywhere; ≥4.5:1 body contrast; keyboard-reachable controls.
- Must remain usable on tablets (≥768px) and degrade gracefully on phones — managers consult (not heavy-edit) on small screens.
- Design system lives in `src/styles.css` (tokens + utility classes) and `src/components.jsx`; extend those rather than adding new systems.
