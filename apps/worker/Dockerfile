FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/worker ./apps/worker
COPY packages ./packages

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @repo/db run db:generate
RUN pnpm --filter @repo/db run build

WORKDIR /app/apps/worker

CMD ["npx", "tsx", "src/index.ts"]
