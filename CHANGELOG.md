# Changelog

All notable changes to the Bricks website. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/). A release is a tag `vX.Y.Z` on `master` (docs/runbook/deploy.md); its section is written in the release PR.

Lowest ProBiz CMS version: 1.0.0 (README.md).

## [Unreleased]

## [1.0.0] - 2026-11-20

The first release: the whole of v1 (docs/decisions/0001 F1).

### Added

- The project: Next.js 16 (App Router), React 19, Tailwind 4, pnpm 11, validated settings from the environment (`API_URL`, `PUBLIC_API_URL`, `SITE_URL`, `REVALIDATE_SECRET`, `MEDIA_PUBLIC_URL`, `TRUSTED_PROXY_HOPS`), `/api/health`, CI (format, lint, typecheck, unit tests, build, Playwright), and the Docker image (standalone output, BuildKit secret for the SDK install, non-root user, health check) (#1).
- CMS pages rendered on the server with ISR and the CMS's signed revalidation webhook: catch-all route, redirects, 410 and a real 404 from the proxy with the 404 report, `bs` (no prefix) and `en` (`/en/...`) with hreflang and a language switcher, visible breadcrumbs with `BreadcrumbList`, canonical address, Open Graph, JSON-LD (`LocalBusiness` subtype), `robots.txt`, `sitemap.xml` and draft preview (#2).
- The Bricks theme from the prototype: tokens, self-hosted Bricolage Grotesque and DM Sans, header, footer, phone bar, and one component per CMS block type (hero with the live "now" line, menu with search, events, venues, opening hours, map link, gallery, reservation form that works without script). A block the theme does not know is skipped (#3).
- The next event, featured wide with its photo and its `Event` JSON-LD; Bosnian dates with the month in the genitive (#4).
- Ordering from the table at `/s/[token]`: the server-rendered menu, the basket, orders sent from the browser to the public API, live status over SSE with polling as fallback, calling the waiter, and a page for a code that is not valid (`noindex, follow`) (#5).
- Deploy files (this release): `deploy/compose.yml` (service `bricks-site` on the CMS's edge network only, read-only root file system, no capability, memory limit), `deploy/.env.example`, `deploy/bricks.caddy`, the image labels `org.probiz.min-cms-version` and `org.opencontainers.image.version` that `deploy-site` reads, the release workflow (tag `vX.Y.Z` pushes `ghcr.io/neramsoft/bricks-site:X.Y.Z`, `X.Y` and `latest`), CI checks of the Compose file and the workflows, and `docs/runbook/deploy.md` (#6).

### Changed

- `.env.example` describes both uses of `PUBLIC_API_URL`: table ordering and the events' calendar link.
- The image's start-up wrapper keeps the patched `server.js` in memory instead of writing `server.runtime.mjs` beside it, so the container can run with a read-only root file system.
