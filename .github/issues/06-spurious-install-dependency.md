---
title: "[Chore] Spurious `install` package in production dependencies"
labels: chore, dependencies
priority: medium
---

## Description

`package.json` includes `install` as a runtime dependency:

```json
// package.json:14
"dependencies": {
  ...
  "install": "^0.13.0",
  ...
}
```

The [`install`](https://www.npmjs.com/package/install) npm package is a utility for programmatic npm invocations. It is not used anywhere in the application source and is almost certainly an artifact of accidentally running `npm install <something>` without the `--save-dev` flag, or a typo.

## Impact

- Adds an unnecessary package to the production bundle.
- Increases attack surface with an unused dependency.
- Misleads contributors about the app's runtime requirements.

## Suggested Fix

Remove the entry from `dependencies`:

```bash
pnpm remove install
```

Verify no file in `src/` or `convex/` imports from `install` before removing.
