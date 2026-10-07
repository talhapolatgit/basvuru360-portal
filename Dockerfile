# Basvuru360 Portal — Coolify / production static build
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build-time API URL. Boş bırakılırsa portal kendi domainindeki /api/v1'i kullanır;
# nginx bu istekleri ADMIN_API_URL'e iletir (admin dışarıya kapalı olabilir).
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:1.27-alpine AS runtime

# /api/ isteklerinin iletileceği admin uygulaması (Docker ağı içindeki adı ve portu).
# Coolify'da portal uygulamasının ortam değişkenlerinden değiştirilebilir.
ENV ADMIN_API_URL=http://gz4oa2wlpsejfkfs1za2pyzt:8080

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
