FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/chess-mcp ./apps/chess-mcp
COPY packages ./packages

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/chess-mcp

RUN pnpm run build

CMD ["node", "build/index.js"]
