# CLAUDE.md — Bricks web

This repository is the public website of **Bricks**, a café-bar in Tuzla (`bricks.ba`). It is a client website of **ProBiz CMS** (SKY Media's headless CMS), in a repository of its own. It is **not** `apps/web` of the CMS monorepo: it talks to the CMS only through the public API and the typed SDK, and it is released and deployed separately (ProBiz CMS docs/decisions/0054).

**Lowest ProBiz CMS version this site needs: 1.0.0.** Raise it here, in `README.md` and in the SDK range of `package.json` whenever the site starts to use something a later CMS adds.

**Before planning any feature, read `docs/decisions/`.** The reference for patterns is `apps/web` in `neramsoft/probiz-cms` (catch-all route, proxy, cached clients, block registry, SEO helpers, revalidation webhook). The code is written again here, not copied across.

## Layout

```
src/app/              Next.js (App Router): [[...route]] (CMS pages, ISR), missing (404), preview, robots.txt, sitemap.xml, api/health, api/revalidate
src/proxy.ts          Redirects (301/302), gone (410), unknown address to /missing (404)
src/lib/              env, api (cms, cmsUncached), data, tags, revalidation, locale, messages, page-metadata, jsonld, breadcrumbs, proxy state
src/blocks/           Block check (parse.ts), registry (blocks.tsx), typed data (types.ts), one component per block type (components/)
src/components/       Header, footer, phone bar, breadcrumbs, JSON-LD, page view, 404 view
src/{menu,events,locations,forms}/  View-models, JSON-LD, search and form handling of the blocks that need them
src/styles/           Tokens and the theme's stylesheets (tokens.css is the prototype's)
src/fonts/            The brand fonts (next/font/local, lib/fonts.ts)
e2e/                  Playwright specs; e2e/support/ is the fake CMS API (api-fixture.ts) and its typed fixtures
test/fixtures/        Typed API answers (ApiComponents) shared by the unit tests
docker/web-server.mjs Start-up wrapper of the image: sets next/image's media hosts from the environment
Dockerfile            Standalone image (BuildKit secret `npm_token` for the SDK install)
.github/workflows/    CI
docs/decisions/       Decision records
.claude/agents/       Subagent: website-developer
public/               Static files
```

Tooling: pnpm 11 (single package, not a monorepo), Node 24 (`.nvmrc`), Next 16, React 19, TypeScript 5.9, Tailwind 4, zod 4, Vitest 5, ESLint 9 (flat config) and Prettier.

## Commands

- `pnpm dev`: the site on http://localhost:3000 (needs the CMS API; settings in `.env.example`)
- `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build`
- `pnpm test:e2e`: Playwright against the built site and the fixture API (ports 4010 and 4011; `pnpm build` first; screenshots at 1440 and 390 px in `test-results/screenshots`). Set `PLAYWRIGHT_CHROMIUM_PATH` where the browser was not installed with `pnpm exec playwright install chromium`
- `pnpm format` / `pnpm format:check`
- `NPM_TOKEN=... pnpm install`: the SDK is a private package on GitHub Packages (see `README.md`); the token is never written to a file
- `docker build --secret id=npm_token,env=NPM_TOKEN -t bricks-site .`: the image

## Non-negotiable rules

**SEO**

- Every public page is server-rendered. No client-only rendering of content; client components only for interaction.
- JSON-LD, Open Graph and the visible page must match.
- Every page below the homepage has breadcrumbs, as visible markup and as `BreadcrumbList`.
- Images go through `next/image` with explicit sizes.
- Search results, form thank-you pages, the table-ordering pages and 404 are `noindex, follow`.

**The CMS contract**

- The site reads the CMS only through `@probiz/sdk` (an npm alias of `@neramsoft/probiz-sdk`) and the public media origin. No client-specific content goes into the CMS core.
- Block components map 1:1 to the API's block types. An unknown block renders nothing and never breaks the page.
- Previews, form responses and everything about an order are never cached.

**Security**

- No secrets in the repository, images or logs. `NPM_TOKEN` and `REVALIDATE_SECRET` live in the environment, GitHub secrets or the server's `.env`. `.npmrc` names `${NPM_TOKEN}` and never a value.

**Language**

- Code, comments, commits and docs in English. UI copy is translatable. Locales: `bs` (ijekavica, Latin script; the default, no URL prefix) and `en` (`/en/...`).

**Accessibility and performance**

- Semantic HTML, alt text, keyboard navigation, contrast. No layout shift. Third-party scripts only after consent.

## Branches and releases

- Branch names: `feature/<feature-name>` for new work, `fix/<what-the-fix-is-about>` for fixes, `hotfix/<what-the-fix-is-about>` for urgent production fixes. Lowercase, words joined by hyphens. No other prefixes.
- `feature/*` and `fix/*` branch from `development` and merge back by PR (squash).
- `development` → `master` by release PR (merge commit). A tag `vX.Y.Z` on `master` builds the image.
- `hotfix/*` branch from `master`, merge to `master`, then back into `development`.
- Conventional commit messages and PR titles (`feat:`, `fix:`, `chore:`, `docs:`).
- **Commits are authored by the project owner only.** No `Co-Authored-By`, session links or other attribution trailers in commits, and no attribution footer in PR descriptions.

## Working agreement

1. For each feature, start in plan mode: propose the approach, files and tests, then wait for approval before changing files.
2. Keep PRs small: one feature or one screen per PR.
3. Screens and pages get a Playwright test with screenshots at 1440 px and 390 px (against a fixture API, docs/decisions/0001 F8, `pnpm test:e2e`).
4. Run `pnpm lint`, `pnpm typecheck` and `pnpm test` (and `pnpm build`) before saying a task is done.
5. If a decision isn't covered here or in `docs/decisions/`, ask instead of guessing: recommend an option, then record the answer in `docs/decisions/`.
6. If a page needs data the API does not give, describe the gap as a proposed CMS change instead of working around it in the theme.

## Subagents

Delegate website work to `website-developer` (`.claude/agents/website-developer.md`). **Subagents run on Sonnet, never on Opus** (`model: sonnet`; pass the same model when starting one).
