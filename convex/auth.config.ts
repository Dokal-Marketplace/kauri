// convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.VITE_CLERK_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};