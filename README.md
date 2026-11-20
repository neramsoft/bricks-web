# Bricks web

The public website of Bricks (bricks.ba): a café-bar site built on ProBiz CMS.

The site talks to the CMS only through its public API and `@probiz/sdk`. It is released and deployed separately from the CMS (ProBiz CMS docs/decisions/0054).

Lowest ProBiz CMS version: 1.0.0.

Decisions are in [`docs/decisions/`](docs/decisions/); rules for contributors and agents are in [`CLAUDE.md`](CLAUDE.md).

## Requirements

- Node 24 (`.nvmrc`) and pnpm 11 (`corepack enable`)
- A running ProBiz CMS API (`API_URL`)
- `NPM_TOKEN`, to install the SDK (below)

## The SDK and `NPM_TOKEN`

`@probiz/sdk` is an npm alias of `@neramsoft/probiz-sdk`, a private package on GitHub Packages. The committed `.npmrc` points the `@neramsoft` scope at `https://npm.pkg.github.com` and reads the token from the environment:

```
export NPM_TOKEN=ghp_...   # classic personal access token with read:packages
pnpm install
```

`NPM_TOKEN` is a **classic** personal access token with the `read:packages` scope (GitHub Packages does not accept fine-grained tokens). It is never committed, never written to `.npmrc`, `package.json` or a Dockerfile. Put it in your shell profile or a password manager. In CI the workflow uses `GITHUB_TOKEN` (this repository needs Read access to `probiz-sdk` and `probiz-blocks`). See ProBiz CMS `docs/runbook/sdk-in-a-client-site.md`.

## Settings

Copy `.env.example` to `.env.local`. `API_URL` and `SITE_URL` are required in production; the other settings are optional. `PUBLIC_API_URL` (default `API_URL`) is the API address the guest's browser reaches, used by table ordering. Each is documented in `.env.example`.

## Commands

| Command                        | What it does                                      |
| ------------------------------ | ------------------------------------------------- |
| `pnpm dev`                     | The site on http://localhost:3000 (needs the API) |
| `pnpm build` / `pnpm start`    | Production build and server                       |
| `pnpm lint`                    | ESLint                                            |
| `pnpm typecheck`               | `next typegen` and `tsc --noEmit`                 |
| `pnpm test`                    | Vitest unit tests                                 |
| `pnpm format` / `format:check` | Prettier, write / check                           |

## Docker image

```
docker build --secret id=npm_token,env=NPM_TOKEN --build-arg SITE_VERSION=0.1.0 \
  -t ghcr.io/neramsoft/bricks-site:0.1.0 .
docker run --rm -p 3000:3000 -e API_URL=https://api.bricks.ba -e SITE_URL=https://bricks.ba \
  ghcr.io/neramsoft/bricks-site:0.1.0
```

The token is a BuildKit secret: it is used for the install only and stays out of every layer. The health check is `/api/health`.

## Branches

`feature/*` and `fix/*` from `development`, merged by squash PR; `development` to `master` by release PR. Conventional commits.
