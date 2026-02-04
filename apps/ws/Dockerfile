FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/ws ./apps/ws
COPY packages ./packages

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/ws

CMD ["pnpm", "run", "dev"]
