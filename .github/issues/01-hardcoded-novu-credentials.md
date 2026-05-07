---
title: "[Security] Hardcoded Novu credentials and static subscriberId in Inbox.jsx"
labels: security, bug
priority: critical
---

## Description

`src/components/Inbox.jsx` hardcodes both the Novu `applicationIdentifier` and a static `subscriberId` directly in source.

```jsx
// src/components/Inbox.jsx:5-6
<Inbox
  applicationIdentifier="mLtXHnJfZNRB"
  subscriberId="69fa4317aca4539eeabcdc44"
/>
```

## Impact

- **`applicationIdentifier`** is a secret committed to the repository — anyone with read access can interact with your Novu application.
- **`subscriberId`** is hardcoded to a single user ID, meaning every authenticated user sees the **same person's notifications**. This is both a privacy leak and a functional bug.

## Steps to Reproduce

1. Open `src/components/Inbox.jsx`.
2. Observe that both values are string literals, not environment variables.
3. Any logged-in user will receive notifications destined for subscriber `69fa4317aca4539eeabcdc44`.

## Suggested Fix

1. Move `applicationIdentifier` to an environment variable:
   ```bash
   # .env
   VITE_NOVU_APP_ID=mLtXHnJfZNRB
   ```

2. Resolve `subscriberId` from the authenticated session:
   ```jsx
   <Inbox
     applicationIdentifier={import.meta.env.VITE_NOVU_APP_ID}
     subscriberId={currentUser.id}
   />
   ```

3. **Rotate** the existing `applicationIdentifier` — it is already public in git history.
