# syntax=docker/dockerfile:1
# Build context: repo root (npm workspaces). See docker-compose.yml.

# ---- build: static SPA bundle ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/web apps/web
# Vite inlines VITE_* at build time. This is the URL the BROWSER uses to reach our API.
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build -w @catalogue/web
# Fill the CSP connect-src with the API origin from the same build arg, so they cannot drift.
COPY apps/web/security-headers.conf /tmp/security-headers.conf
RUN API_ORIGIN="$(node -e 'console.log(new URL(process.env.VITE_API_URL).origin)')" \
  && sed "s#__API_ORIGIN__#${API_ORIGIN}#" /tmp/security-headers.conf > /tmp/security-headers.rendered.conf \
  && grep -q "connect-src 'self' ${API_ORIGIN};" /tmp/security-headers.rendered.conf

# ---- runtime: unprivileged nginx serving static files ----
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /tmp/security-headers.rendered.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
# Image default user is nginx (uid 101), listening on unprivileged port 8080.
USER 101
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
