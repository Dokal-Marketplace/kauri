---
title: "[Code Quality] Dead state variables in ClientsPage and TransactionsPage"
labels: code-quality, cleanup
priority: low
---

## Description

Two `useState` declarations are never read or used anywhere in their respective components.

### 1. `commandPaletteActive` in `ClientsPage.jsx`

```jsx
// src/pages/ClientsPage.jsx:149
const [commandPaletteActive, setCommandPaletteActive] = useState(false)
```

Neither `commandPaletteActive` nor `setCommandPaletteActive` is referenced anywhere else in the component.

### 2. `period` filter in `TransactionsPage.jsx`

```jsx
// src/pages/TransactionsPage.jsx:115
const [period, setPeriod] = useState("7j")
```

The period segmenter is rendered in the UI (lines 183–186) and `setPeriod` is wired up, but `period` is never included in the `filtered` memo's dependency array or logic — so the 24h/7j/30j/Tout buttons change state that has no effect on the displayed data.

## Impact

- Dead state triggers unnecessary re-renders when set.
- The period filter gives users a false sense of filtering — selecting "24h" silently does nothing.
- Increases cognitive overhead for contributors reading the component.

## Suggested Fix

**For `commandPaletteActive`:** Delete the declaration entirely.

**For `period`:** Either wire it into the `filtered` memo to actually filter by time range, or remove the UI controls and the state until the feature is implemented.
