---
title: "[Chore] Legacy prototype files at project root should be deleted"
labels: chore, cleanup
priority: medium
---

## Description

The following files exist at the project root alongside `index.html` and `vite.config.js`, but are not part of the module-based application in `src/`:

- `components.jsx`
- `data.jsx`
- `icons.jsx`
- `products-page.jsx`
- `settings-page.jsx`
- `transactions-page.jsx`

These files export to `window` globals (`window.KauriComponents`, `window.KAURI_DATA`) and appear to be early prototypes predating the current `src/` architecture.

## Impact

- Duplicates of `src/components.jsx`, `src/data.jsx`, etc. exist, making it unclear which files are canonical.
- Contributors may accidentally edit the wrong file.
- The root files are bundled into `dist/` by Vite if imported, but more likely they're just dead weight that confuses the project structure.
- `window.*` global exports are an anti-pattern in a module-based React app.

## Suggested Fix

Verify none of these files are imported anywhere:

```bash
grep -r "from '../components'" src/  # should all point to src/components
grep -r "window.KauriComponents" src/
grep -r "window.KAURI_DATA" src/
```

Then delete the root-level duplicates:

```bash
rm components.jsx data.jsx icons.jsx products-page.jsx settings-page.jsx transactions-page.jsx
```
