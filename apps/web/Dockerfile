FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web ./apps/web
COPY packages ./packages

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @repo/db run db:generate
RUN pnpm --filter @repo/db run build

# Declare build-time args so NEXT_PUBLIC_* vars are baked into the JS bundle
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

WORKDIR /app/apps/web

RUN pnpm build

CMD ["pnpm", "next", "start"]
