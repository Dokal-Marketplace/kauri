import { lazy } from 'react'

/**
 * Wraps React.lazy() so that if a dynamic chunk fails to fetch
 * (stale deployment — the hashed filename no longer exists on the server)
 * the page does a single hard-reload to pick up fresh HTML/assets.
 *
 * The reload flag is stored in sessionStorage so we don't loop forever
 * if the chunk is genuinely broken.
 */
export function lazyWithReload(factory) {
  return lazy(() =>
    factory().catch((err) => {
      const reloadKey = `chunk-reload-${factory.toString().slice(0, 40)}`
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1')
        window.location.reload()
        // Return a never-resolving promise so React doesn't render garbage
        return new Promise(() => {})
      }
      throw err
    })
  )
}
