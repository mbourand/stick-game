FROM node:22-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile --filter "@tau/back..."

RUN pnpm --filter @tau/back run build

ENV NODE_ENV=production
WORKDIR /app/apps/back

EXPOSE 3001

CMD ["pnpm", "run", "start:prod"]
