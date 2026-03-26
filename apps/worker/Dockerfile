FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/worker ./apps/worker
COPY packages ./packages

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/worker

CMD ["pnpm", "run", "dev"]
