FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/backend ./apps/backend
COPY packages ./packages

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/backend

CMD ["pnpm", "run", "dev"]
