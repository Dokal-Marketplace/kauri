---
title: "[Chore] Documentation prose accidentally committed inside reconciliation.ts"
labels: chore, cleanup
priority: low
---

## Description

`convex/reconciliation.ts` contains a large block of multi-paragraph prose starting at line 59 — inside the source file after the closing brace of `settleDailyCash`:

```ts
// convex/reconciliation.ts:59-68
// 3. The Reconciliation WorkflowA clean EOD process usually follows these three steps...
// Step A: The Agent's Pre-Check (TPE Side)Before heading to the branch...
// ...
// $$Variance = V_{physical} - \sum V_{system}$$
// Are you planning to generate a PDF or thermal receipt...?
```

This appears to be LLM-generated design context that was pasted directly into the source file rather than into a design doc or README.

## Impact

- Pollutes the source file with non-code content.
- The "Are you planning to…?" phrasing confirms this was never intended as production code.
- Confuses future readers about what is intentional implementation and what is noise.

## Suggested Fix

Delete lines 59–68 from `convex/reconciliation.ts`. If the workflow documentation is worth keeping, move it to `docs/reconciliation.md` or the relevant section of the project wiki.
