FROM node:22.14.0-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_GOOGLE_AUTH_ENABLED=false
ARG VITE_LOCAL_AI_ENABLED=false
ARG VITE_SITE_URL=http://localhost:3000
ARG VITE_PLAUSIBLE_DOMAIN=
ARG VITE_PLAUSIBLE_SCRIPT_URL=
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_GOOGLE_AUTH_ENABLED=$VITE_GOOGLE_AUTH_ENABLED
ENV VITE_LOCAL_AI_ENABLED=$VITE_LOCAL_AI_ENABLED
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_PLAUSIBLE_DOMAIN=$VITE_PLAUSIBLE_DOMAIN
ENV VITE_PLAUSIBLE_SCRIPT_URL=$VITE_PLAUSIBLE_SCRIPT_URL
RUN npm run build

FROM node:22.14.0-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV LOCAL_AI_ENABLED=false
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["npm", "start"]
