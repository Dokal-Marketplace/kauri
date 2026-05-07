---
title: "[Code Quality] JSX elements inside data.jsx couple view logic to data layer"
labels: code-quality, refactor
priority: medium
---

## Description

`src/data.jsx` (and the root `data.jsx`) contains JSX elements inside the `FEED` data array:

```jsx
// data.jsx:58-62
const FEED = [
  { dot: "brand", text: <><strong>Awa Konaté</strong> a effectué un dépôt de <strong>15 000 FCFA</strong>.</>, time: "Aujourd'hui · 10:22" },
  { dot: "muted", text: <><strong>Ibrahim Traoré</strong> a retiré <strong>30 000 FCFA</strong> en agence.</>,  time: "Aujourd'hui · 09:05" },
  ...
]
```

## Impact

- Data files cannot be serialized, stored, or fetched from an API without losing the JSX nodes.
- Unit testing the data in isolation requires a JSX transform.
- Tightly couples markup decisions to the data definition — changing how a name is styled requires editing the data file.
- The `.jsx` extension on files containing no JSX (`data.jsx`) misleads tooling and developers.

## Suggested Fix

Store plain strings in the data and let the rendering component apply markup:

```js
// data.js — plain strings
const FEED = [
  { dot: "brand", actor: "Awa Konaté",     action: "a effectué un dépôt de", amount: "15 000 FCFA", time: "Aujourd'hui · 10:22" },
  { dot: "muted", actor: "Ibrahim Traoré", action: "a retiré",               amount: "30 000 FCFA", time: "Aujourd'hui · 09:05" },
]
```

```jsx
// ActivityCard — markup stays in the component
{feed.map((f, i) => (
  <div key={i} className="feed-text">
    <strong>{f.actor}</strong> {f.action} <strong>{f.amount}</strong>
  </div>
))}
```

Rename `data.jsx` → `data.js` once JSX is removed.
