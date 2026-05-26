# generate-openapi-schemas

CLI for generating Zod schemas from an OpenAPI spec via `@hey-api/openapi-ts`.

## Usage

```bash
pnpm exec generate-openapi-schemas --input ./openapi.json --output ./src/lib
```

Each schemas package (`@tau/back-schemas`, `@tau/osu-schemas`) exposes a `generate`
script that wraps this CLI.
