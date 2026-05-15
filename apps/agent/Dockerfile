FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

COPY apps/agent    ./apps/agent
COPY apps/chess-mcp ./apps/chess-mcp
COPY packages      ./packages

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @repo/db run db:generate
RUN pnpm --filter @repo/db run build

RUN pnpm --filter chess-mcp run build

WORKDIR /app/apps/agent

CMD ["npx", "tsx", "src/index.ts"]
