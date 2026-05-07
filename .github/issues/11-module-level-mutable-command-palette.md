---
title: "[Code Quality] Module-level mutable singleton in CommandPalette.jsx"
labels: code-quality
priority: low
---

## Description

`src/components/CommandPalette.jsx` uses a module-level mutable variable to expose the internal `setOpen` function externally:

```js
// src/components/CommandPalette.jsx:5-6
let _setOpen = null
export function openCommandPalette() { _setOpen?.(true) }
```

An effect syncs it on mount/unmount:

```js
useEffect(() => { _setOpen = setOpen; return () => { _setOpen = null } }, [])
```

## Impact

- Works only with a single mounted instance — rendering a second `AppCommandPalette` would overwrite `_setOpen`.
- Creates invisible imperative coupling: callers of `openCommandPalette()` are not linked to the component via React's data flow.
- A search of the codebase shows `openCommandPalette` is not imported or called anywhere — making this dead code.

## Suggested Fix

If the exported function is not used, delete it along with the `useEffect` that manages `_setOpen`:

```diff
- let _setOpen = null
- export function openCommandPalette() { _setOpen?.(true) }

  export default function AppCommandPalette({ setActive }) {
    const [open, setOpen] = useState(false)
-   useEffect(() => { _setOpen = setOpen; return () => { _setOpen = null } }, [])
```

If triggering the palette imperatively is a genuine requirement, use a React context or a lightweight event emitter instead.
