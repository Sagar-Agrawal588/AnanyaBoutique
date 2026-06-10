# Ananya Boutique Admin Deployment Report

## Architecture

- Admin app location: `frontend/admin`
- Framework: Next.js App Router, React, Material UI, Tailwind CSS
- Package manager: npm
- Build command: `npm run build`
- Install command: `npm ci`
- Output directory: Vercel default `.next`
- Runtime target: Node.js 22.x on Vercel
- Backend API: `https://ananya-boutique-api.onrender.com`
- Backend API base: `https://ananya-boutique-api.onrender.com/api`
- Current admin routing model: the admin app uses `basePath: "/admin"`.

## Recommended Production URL

Target admin URL:

```text
https://ananyaboutique.com/admin
```

This is the selected long-term architecture. The admin remains a separate Next.js deployment with `basePath: "/admin"`, and the customer storefront rewrites `/admin` traffic to that admin zone.

Recommended long-term setup:

```text
Storefront: https://ananyaboutique.com
Admin:      https://ananyaboutique.com/admin
API:        https://ananya-boutique-api.onrender.com
```

## Environment Variables

Required for the Vercel Admin project:

```env
NEXT_PUBLIC_BACKEND_URL=https://ananya-boutique-api.onrender.com
NEXT_PUBLIC_API_URL=https://ananya-boutique-api.onrender.com/api
NEXT_PUBLIC_APP_API_URL=https://ananya-boutique-api.onrender.com/api
NEXT_PUBLIC_ADMIN_URL=https://ananyaboutique.com/admin
NEXT_PUBLIC_CLIENT_URL=https://ananyaboutique.com
NEXT_PUBLIC_SITE_URL=https://ananyaboutique.com
```

Required only if Google admin login, Firebase upload features, analytics, or push messaging are enabled:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

Backend Render environment requirements for admin access:

```env
ADMIN_URL=https://ananyaboutique.com/admin
CORS_ORIGINS=https://ananyaboutique.com,https://www.ananyaboutique.com,https://ananya-boutique-client.vercel.app,https://admin.ananyaboutique.com
```

Customer Vercel project environment required for Multi-Zone routing:

```env
ADMIN_ZONE_URL=https://ananya-boutique-admin.vercel.app
```

Use the actual Admin Vercel deployment origin. Do not include `/admin`; the customer app adds that path in the rewrite target.

## Deployment Status

Status: prepared for Vercel deployment.

Automatic deployment was not completed from this workstation because Vercel account access/project creation requires dashboard or CLI authentication. The repository is prepared so Vercel can deploy it without code changes.

## Vercel Project Settings

Use these settings when creating the Admin Vercel project:

```text
Root Directory: frontend/admin
Framework Preset: Next.js
Install Command: npm ci
Build Command: npm run build
Output Directory: default
Node Version: 22.x
Production Branch: main
Auto Deploy: enabled
```

## Verification Completed

Production build:

```text
npm --prefix frontend/admin run build
PASS
```

Local production route smoke:

```text
http://127.0.0.1:3104/admin/login
HTTP 200

http://127.0.0.1:3104/admin
HTTP 200

http://127.0.0.1:3104/admin/api/backend/products?limit=1
HTTP 200

http://127.0.0.1:3104/login
HTTP 307 redirect to /admin/login
```

Backend CORS smoke:

```text
OPTIONS https://ananya-boutique-api.onrender.com/api/admin/login
Origin: https://ananyaboutique.com
HTTP 204
access-control-allow-origin: https://ananyaboutique.com
access-control-allow-credentials: true
```

Admin auth route smoke:

```text
POST https://ananya-boutique-api.onrender.com/api/admin/login
Origin: https://ananyaboutique.com
HTTP 400 for deliberately invalid credentials
```

This confirms the route and CORS path are reachable. A successful login still needs a real production admin account credential smoke test.

Compiled artifact scan:

```text
No obsolete api.ananyaboutique.com references found in compiled admin output.
```

## Production Backend Configuration

The admin frontend now defaults to:

```text
https://ananya-boutique-api.onrender.com/api
```

Configuration files and runtime utilities were updated so the admin app no longer defaults to the obsolete API domain.

Localhost references remain only as local-development guards. They are hostname-gated and do not execute on production domains.

## Remaining Issues

- The admin app has not been deployed automatically because Vercel credentials/project access are required.
- A successful admin login has not been verified because production admin credentials were not available.
- The customer Vercel project must set `ADMIN_ZONE_URL` to the Admin Vercel origin and redeploy before `/admin` can resolve.
- If Google login is used, add the deployed admin domain to Firebase Authentication authorized domains.

## Manual Deployment Steps

1. In Vercel, create a new project from the same GitHub repository.
2. Set Root Directory to `frontend/admin`.
3. Set Framework Preset to `Next.js`.
4. Set Install Command to `npm ci`.
5. Set Build Command to `npm run build`.
6. Leave Output Directory as default.
7. Set Node Version to `22.x`.
8. Add all required environment variables listed above.
9. Deploy from branch `main`.
10. Copy the Admin Vercel deployment origin.
11. In the Customer Vercel project, set `ADMIN_ZONE_URL` to that Admin origin.
12. In the Customer Vercel project, assign `ananyaboutique.com` and `www.ananyaboutique.com`.
13. Redeploy the Customer project so `/admin` rewrites become active.
14. Smoke test login, dashboard, products, orders, uploads, settings, and logout at `https://ananyaboutique.com/admin`.

## Scalable Production Recommendation

Use three separately managed production surfaces:

```text
Customer storefront: Vercel project for frontend/client
Admin panel:         Vercel project for frontend/admin
Backend API:         Render service for server
```

This keeps admin security, deploy permissions, caching, and route behavior separate from the public storefront while still allowing the admin to manage the same production backend.
