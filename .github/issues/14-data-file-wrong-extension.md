---
title: "[Chore] src/data.jsx should be renamed to data.js"
labels: chore, cleanup
priority: low
---

## Description

`src/data.jsx` uses the `.jsx` extension but contains no JSX syntax — only plain JavaScript arrays and objects:

```js
// src/data.jsx — no JSX here (after issue #07 is resolved)
const CLIENTS = [ { id: 1, name: "Awa Konaté", ... }, ... ]
const VOLUME  = [ { m: "Jan", in: 280, out: 90 }, ... ]
```

Note: once issue #07 (JSX in data file) is resolved, this file will contain zero JSX.

## Impact

- The `.jsx` extension signals to tooling and developers that the file contains JSX transforms, which is misleading.
- Some linters and build tools apply different rules to `.jsx` vs `.js` files.
- Minor but adds noise to the project.

## Suggested Fix

```bash
git mv src/data.jsx src/data.js
```

Update the import in any file that references it:

```js
// Before
import { CLIENTS, KPIS } from '../data'

// No change needed if using extensionless imports — Vite resolves both
```

Vite resolves extensionless imports in order `['.mjs', '.js', '.ts', '.jsx', '.tsx', ...]`, so no import paths need updating.
