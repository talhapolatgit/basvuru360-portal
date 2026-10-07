# Basvuru360 Portal

React + TypeScript + Vite frontend for Basvuru360.

Admin/API repo: [basvuru360-admin](https://github.com/talhapolatgit/basvuru360-admin)

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

By default API calls go through the Vite proxy (`/api` → `VITE_API_PROXY_TARGET`, usually `http://127.0.0.1:8001`).

Optional: set `VITE_API_BASE_URL` to call the API directly (e.g. production admin URL + `/api/v1`).

## Coolify (production)

Portal is a static SPA served by nginx (Dockerfile). Deploy as a **separate** Coolify application from `basvuru360-admin`.

1. New Resource → GitHub → `talhapolatgit/basvuru360-portal`
2. Build pack: **Dockerfile** (uses repo `Dockerfile`)
3. **Ports Exposes: `80`** (nginx listens here; wrong port → 502 Bad Gateway even if status is Running)
4. Domains: `https://portal.yourdomain.com` — if still 502, try `https://portal.yourdomain.com:80` once, save, redeploy
5. Build-time environment / ARG:

| Variable | Example | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `https://admin.yourdomain.com/api/v1` | Required in production. Baked into the JS bundle at build time. |

6. On **basvuru360-admin** (Laravel): allow this portal origin in CORS (`FRONTEND_URL` / `SANCTUM_STATEFUL_DOMAINS` / `CORS_ALLOWED_ORIGINS` as configured in admin).

Rebuild the portal after changing `VITE_API_BASE_URL` (Vite embeds env at build time).
