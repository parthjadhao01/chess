FROM node:20-alpine

WORKDIR /usr/src/app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml turbo.json pnpm-workspace.yaml ./
COPY packages/db ./packages/db

RUN pnpm install --frozen-lockfile

WORKDIR /usr/src/app/packages/db

CMD ["pnpm", "run", "db:deploy"]
CMD ["npx", "prisma", "studio"]
