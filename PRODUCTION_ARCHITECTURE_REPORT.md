# Ananya Boutique Final Production Architecture Report

## Chosen Architecture

Selected option: **Option B - separate deployments using Vercel Multi-Zone rewrites**.

Final public URLs:

```text
Customer: https://ananyaboutique.com
Admin:    https://ananyaboutique.com/admin
Backend:  https://ananya-boutique-api.onrender.com
```

The customer storefront remains the primary Vercel project for `ananyaboutique.com`. It rewrites `/admin` and `/admin/:path*` to the separate Admin Vercel deployment. The Admin app keeps `basePath: "/admin"` so its routes, assets, metadata, manifest, and public files are naturally scoped below `/admin`.

## Why Option B

Option B is the best long-term architecture for this project because it gives the professional same-domain URL while preserving operational separation between the public ecommerce storefront and the private admin dashboard.

## Option Comparison

| Area | Option A: Merge Apps | Option B: Multi-Zone | Option C: Subdomain |
| --- | --- | --- | --- |
| Scalability | Weaker. Customer and admin deploy together. | Strong. Each app deploys independently. | Strong. Each app deploys independently. |
| Maintainability | Weaker. Admin dependencies and routes enter storefront app. | Strong. Clear ownership per app. | Strong. Clear ownership per app. |
| Deployment simplicity | Medium initially, worse later. | Medium. Needs one rewrite env var. | Easiest. Separate domains. |
| SEO | Riskier. Admin route lives inside public app. | Strong. Admin is disallowed in robots and not in sitemap. | Strong. Admin separate from storefront. |
| Authentication | More coupling between customer and admin auth. | Good. Same browser origin when accessed through `/admin`. | Good, but cross-subdomain behavior needs more cookie/domain care. |
| Performance | Weaker. Storefront build includes admin dependencies if merged poorly. | Strong. Customer bundle stays customer-only. | Strong. Customer bundle stays customer-only. |
| Vercel Hobby compatibility | Compatible, but not ideal. | Compatible through rewrites/basePath. | Compatible. |
| Future readiness | Medium. Harder to split later. | Strong. Can later move to subdomain, proxy project, or enterprise routing. | Strong, but less aligned with preferred brand URL. |

## Why Not Option A

Merging the Admin app into the Customer app would create unnecessary coupling:

- Admin-only dependencies such as charts, dashboards, and internal workflows would live beside customer storefront code.
- Storefront deploys would become more sensitive to admin changes.
- Admin auth/layout behavior would have to be reconciled with customer layout/auth behavior.
- The customer app already has mature routing, SEO, CMS, and ecommerce flows. A merge would be a migration project, not a deployment architecture improvement.

Option A should only be revisited if the business wants one monolithic Next.js application and is comfortable paying the migration cost.

## Why Not Option C

`https://admin.ananyaboutique.com` is technically clean and remains a valid fallback. However, it gives up the preferred professional URL even though the current app structure already supports `/admin` cleanly through Multi-Zone routing.

Option C is the backup path if a future Vercel limitation, DNS constraint, or security policy makes path-based admin routing undesirable.

## Implementation Details

Customer app changes:

- Added Multi-Zone rewrite support in `frontend/client/next.config.mjs`.
- The customer app now reads `ADMIN_ZONE_URL` or `NEXT_PUBLIC_ADMIN_ZONE_URL`.
- `/admin` rewrites to `${ADMIN_ZONE_URL}/admin`.
- `/admin/:path*` rewrites to `${ADMIN_ZONE_URL}/admin/:path*`.
- Rewrites run in `beforeFiles` so the public storefront catch-all route cannot claim `/admin`.
- Added `ADMIN_ZONE_URL` and `LOCAL_ADMIN_ZONE_URL` examples to `frontend/client/.env.example`.
- Added `/admin` and `/admin/` to customer `robots.js` disallow rules.

Admin app changes:

- Kept `basePath: "/admin"`.
- Updated canonical Admin URL defaults to `https://ananyaboutique.com/admin`.
- Updated Admin deployment env examples and metadata defaults.

Backend changes:

- Updated Render blueprint defaults to final storefront/admin URLs.
- Updated backend env examples to use `ADMIN_URL=https://ananyaboutique.com/admin`.
- Updated CORS origin parsing so a full URL with a path, such as `https://ananyaboutique.com/admin`, is normalized to `https://ananyaboutique.com` for CORS.

## Vercel Configuration

Customer Vercel project:

```text
Root Directory: frontend/client
Framework Preset: Next.js
Install Command: npm ci
Build Command: npm run build
Output Directory: default
Node Version: 22.x
Production Branch: main
Domains:
  ananyaboutique.com
  www.ananyaboutique.com
```

Customer environment variables:

```env
NEXT_PUBLIC_BACKEND_URL=https://ananya-boutique-api.onrender.com
NEXT_PUBLIC_API_URL=https://ananya-boutique-api.onrender.com/api
NEXT_PUBLIC_APP_API_URL=https://ananya-boutique-api.onrender.com/api
NEXT_PUBLIC_SITE_URL=https://ananyaboutique.com
ADMIN_ZONE_URL=https://ananya-boutique-admin.vercel.app
```

Use the actual Admin Vercel origin for `ADMIN_ZONE_URL`. Do not include `/admin`.

Admin Vercel project:

```text
Root Directory: frontend/admin
Framework Preset: Next.js
Install Command: npm ci
Build Command: npm run build
Output Directory: default
Node Version: 22.x
Production Branch: main
```

Admin environment variables:

```env
NEXT_PUBLIC_BACKEND_URL=https://ananya-boutique-api.onrender.com
NEXT_PUBLIC_API_URL=https://ananya-boutique-api.onrender.com/api
NEXT_PUBLIC_APP_API_URL=https://ananya-boutique-api.onrender.com/api
NEXT_PUBLIC_ADMIN_URL=https://ananyaboutique.com/admin
NEXT_PUBLIC_CLIENT_URL=https://ananyaboutique.com
NEXT_PUBLIC_SITE_URL=https://ananyaboutique.com
```

Firebase public env vars are required only if Google login, Firebase Storage, analytics, or push features are enabled in Admin.

## DNS Configuration

Recommended DNS:

```text
ananyaboutique.com      -> Vercel Customer project
www.ananyaboutique.com  -> Vercel Customer project
```

No public admin subdomain is required for the chosen architecture.

Optional fallback DNS:

```text
admin.ananyaboutique.com -> Admin Vercel project
```

Only add this if the business wants emergency direct admin access or a future fallback path.

## Render Configuration

Render backend:

```env
SITE_URL=https://ananyaboutique.com
CLIENT_URL=https://ananyaboutique.com
ADMIN_URL=https://ananyaboutique.com/admin
CORS_ORIGINS=https://ananyaboutique.com,https://www.ananyaboutique.com,https://ananya-boutique-client.vercel.app,https://admin.ananyaboutique.com
BACKEND_URL=https://ananya-boutique-api.onrender.com
API_BASE_URL=https://ananya-boutique-api.onrender.com
```

The `admin.ananyaboutique.com` CORS entry is optional. It is retained as a safe fallback origin.

## Deployment Sequence

1. Deploy the Admin Vercel project from `frontend/admin`.
2. Copy its production origin, for example `https://ananya-boutique-admin.vercel.app`.
3. In the Customer Vercel project, set `ADMIN_ZONE_URL` to the Admin origin.
4. In the Customer Vercel project, set `NEXT_PUBLIC_SITE_URL=https://ananyaboutique.com`.
5. Assign `ananyaboutique.com` and `www.ananyaboutique.com` to the Customer Vercel project.
6. Configure DNS records from the domain registrar to Vercel.
7. Redeploy the Customer project.
8. Update Render env vars to the final domain values.
9. Redeploy or restart the Render backend.
10. Smoke test:
    - `https://ananyaboutique.com`
    - `https://ananyaboutique.com/products`
    - `https://ananyaboutique.com/admin`
    - `https://ananyaboutique.com/admin/login`
    - Admin login
    - Admin products
    - Admin orders
    - Customer cart
    - Customer checkout

## Future Scalability

This architecture keeps the door open for:

- A dedicated admin subdomain if needed later.
- A standalone routing/proxy Vercel project if the platform grows into more zones.
- A future migration to Vercel Microfrontends if team size or deployment topology requires it.
- Independent customer/admin release schedules.
- Public storefront performance optimizations without touching admin code.

## Final Decision

Proceed with Option B.

This achieves the preferred URL structure without merging applications or accepting avoidable coupling:

```text
https://ananyaboutique.com
https://ananyaboutique.com/admin
```
