# Ananya Boutique Render Deployment

## Service

- Provider: Render
- Service type: Web Service
- Environment: Node
- Blueprint: `render.yaml`
- Service name: `ananya-boutique-api`
- Expected URL: `https://ananya-boutique-api.onrender.com`
- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`
- Branch: `main`
- Auto deploy: enabled

If Render reports a different service URL, update `BACKEND_URL`,
`API_BASE_URL`, and the Vercel client API variables to the actual URL.

## Required Render Environment Variables

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes | `production` | Runtime mode. |
| `MONGO_URI` | Yes | none | MongoDB Atlas connection string. |
| `ACCESS_TOKEN_SECRET` | Yes | none | 32+ characters. |
| `REFRESH_TOKEN_SECRET` | Yes | none | 32+ characters and different from access secret. |
| `CLIENT_URL` | Yes | `https://ananya-boutique-client.vercel.app` | Live Vercel storefront origin. |
| `ADMIN_URL` | Yes | `https://admin.ananyaboutique.com` | Admin origin. |
| `SITE_URL` | Yes | `https://ananya-boutique-client.vercel.app` | Public storefront URL until custom domain is live. |
| `CORS_ORIGINS` | Yes | Vercel + custom domains | Include storefront, admin, and future custom domains. |
| `BACKEND_URL` | Yes | `https://ananya-boutique-api.onrender.com` | Public backend origin. |
| `API_BASE_URL` | Yes | `https://ananya-boutique-api.onrender.com` | Public backend origin, no `/api` suffix. |
| `MEDIA_STORAGE_PROVIDER` | Yes | `cloudinary` | Required on Render because local disk is ephemeral. |
| `CLOUDINARY_CLOUD_NAME` | Yes | none | Required for admin uploads. |
| `CLOUDINARY_API_KEY` | Yes | none | Required for admin uploads. |
| `CLOUDINARY_API_SECRET` | Yes | none | Required for admin uploads. |

## Feature-Specific Render Environment Variables

| Variable | Required When | Default | Notes |
| --- | --- | --- | --- |
| `SMTP_HOST` | Email | `smtp.gmail.com` | Do not add until live email is needed. |
| `SMTP_PORT` | Email | `587` | Do not add until live email is needed. |
| `SMTP_SECURE` | Email | `false` | Do not add until live email is needed. |
| `SMTP_USER` | Email | none | Do not add until live email is needed. |
| `SMTP_PASS` | Email | none | Do not add until live email is needed. |
| `EMAIL_FROM_NAME` | Email | `Ananya Boutique` | Do not add until live email is needed. |
| `EMAIL_FROM_ADDRESS` | Email | none | Do not add until live email is needed. |
| `PAYMENT_PROVIDER` | Online payments | none | Do not add until Paytm or PhonePe credentials are issued. |
| `PAYTM_*` | Paytm payments | disabled | Do not add until complete Paytm production credentials are issued. |
| `PHONEPE_*` | PhonePe payments | disabled | Do not add until complete PhonePe production credentials are issued. |
| `FIREBASE_*` | Push/GCS media | none | Optional when using Cloudinary-only uploads. |
| `REDIS_URL` | Distributed cache/rate limiting | none | Optional. |
| `COOKIE_DOMAIN` | Custom same-site subdomains | none | Leave blank for Vercel + Render cross-site setup. |

The Blueprint intentionally omits SMTP, Paytm, and PhonePe variables. Email
sending is skipped safely without SMTP credentials. Online payment providers
remain disabled until their `*_ENABLED=true` flag and full credential set are
added.

## MongoDB Atlas

For Render Free Tier, Atlas network access must allow Render outbound traffic.
If static egress is not available, add `0.0.0.0/0` in Atlas Network Access for
the launch window, then tighten later with a paid static-egress solution.

## Required Vercel Environment Variables

Set these in the Vercel client project after the Render URL is known:

```text
NEXT_PUBLIC_BACKEND_URL=https://ananya-boutique-api.onrender.com
NEXT_PUBLIC_API_URL=https://ananya-boutique-api.onrender.com/api
NEXT_PUBLIC_APP_API_URL=https://ananya-boutique-api.onrender.com/api
NEXT_PUBLIC_SITE_URL=https://ananya-boutique-client.vercel.app
```

Redeploy the Vercel client after saving these variables.

## Smoke Test

```bash
node scripts/production-smoke-check.mjs \
  --backend-url https://ananya-boutique-api.onrender.com \
  --origin https://ananya-boutique-client.vercel.app \
  --origin https://ananyaboutique.com \
  --origin https://www.ananyaboutique.com \
  --origin https://admin.ananyaboutique.com
```
