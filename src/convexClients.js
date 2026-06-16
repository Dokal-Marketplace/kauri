import { ConvexReactClient } from 'convex/react'

export const adminConvex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)
export const agentConvex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)
