# Setup

1. Install `pnpm` (`npm install -g pnpm` or via Corepack)
2. Copy every `.env.template` to `.env` and fill them with the right values
3. `pnpm install && pnpm docker:up:dev && pnpm --filter @tau/back run prisma:migrate:dev`

# Common commands

- `pnpm dev` — run all dev tasks via Turborepo
- `pnpm build` — build everything
- `pnpm lint` / `pnpm test` / `pnpm typecheck`
- `pnpm --filter @tau/front run dev` — run a single package's task
- `pnpm --filter @tau/back-schemas run generate` — regenerate the back's Zod schemas from `openapi.json`
