# Basvuru360 Portal — Coolify / production static build
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build-time API URL (Coolify: set as build ARG / env)
# Example: https://admin.example.com/api/v1
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:1.27-alpine AS runtime

# Coolify healthchecks need curl/wget inside the image
RUN apk add --no-cache curl

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Coolify → Ports Exposes must be 80 (matches this)
EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
