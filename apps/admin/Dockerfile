FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/admin ./apps/admin
COPY packages   ./packages

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/admin

RUN pnpm run build

ENV NODE_ENV=production

CMD ["pnpm", "start"]
