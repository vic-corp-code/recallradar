# Convex setup

RecallRadar uses Convex as the application database and Clerk as the auth provider.

## Environment

The shared development deployment is:

```env
CONVEX_DEPLOYMENT=dev:benevolent-ocelot-389
NEXT_PUBLIC_CONVEX_URL=https://benevolent-ocelot-389.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://benevolent-ocelot-389.convex.site
```

Convex auth also needs the Clerk JWT issuer domain:

```env
CLERK_JWT_ISSUER_DOMAIN=
```

Set the same `CLERK_JWT_ISSUER_DOMAIN` value in the Convex dashboard environment variables for this deployment.

## Clerk JWT template

Create a Clerk JWT template named `convex`. Convex is configured with:

```ts
applicationID: "convex"
```

Once the Clerk issuer domain exists in Convex, run:

```bash
bun run convex:codegen
```

Then start Convex locally with:

```bash
bun run convex:dev
```
