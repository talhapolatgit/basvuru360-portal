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
