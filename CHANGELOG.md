# Changelog

All notable changes to the Bricks website. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/). A release is a tag `vX.Y.Z` on `master` (docs/runbook/deploy.md); its section is written in the release PR.

Lowest ProBiz CMS version: 1.0.0 (README.md).

## [Unreleased]

### Fixed

- Footer: the legal links sit with the copyright line on the left instead of floating in the middle; "Back to top" stays on the right. On phones they stack under the copyright.

## [1.0.3] - 2026-11-23

### Added

- `/llms.txt` (llmstxt.org): Markdown built from the CMS (business name and description, address, opening hours in words, what a visitor can do from the switched-on modules, links to the menus' and pages' addresses in every language, the sitemap). Rebuilt from the cached, tagged CMS reads, so the revalidation webhook refreshes it; the last good text is served while the CMS cannot be read, a plain 404 while indexing is off.

### Changed

- Images load from the CMS's ready WEBP variants on the media origin (Cloudflare) instead of being resized by the site's server; blur-up placeholders; lightbox preloads neighbours (#13).

### Fixed

- PageSpeed, Agentic Browsing: `/.well-known/*`, dotfiles and file kinds the site never serves (`*.php`, `*.json`, `*.txt`, `*.xml` ...) get a tiny plain 404 from the proxy, with no CMS call and no page render, and are not reported to the CMS's 404 log. robots.txt, sitemap.xml and llms.txt are unaffected.
- A slow 404 for an address the visitor really mistyped: the proxy no longer waits for the API when the cached list of languages (one minute) or of live addresses (five minutes) runs out; the old one answers while a new one is read in the background.
- PageSpeed, accessibility: heading order. The titles inside a block (`features`, `locationList`, `eventList`, the opening hours' exceptions) are one level below the block's heading, and `h2` when the block has no heading, so the home page no longer goes from `h1` to `h3`.
- The lightbox closes on a click beside a picture that is still loading (#17).

## [1.0.2] - 2026-11-22

### Added

- Gallery photos open full size: a click (or Enter) on a picture of the `gallery` and `galleryEmbed` blocks opens it in a native dialog with a counter, previous and next, arrow keys, swipe on phones, Esc, the close button or a click beside the picture; focus returns to the picture. The grid stays server-rendered (#10).

## [1.0.1] - 2026-11-20

### Fixed

- The image builds again: the unit tests (`*.test.ts`), which import `test/fixtures`, are left out of the Docker build context, so `next build` no longer type-checks them without their fixtures. 1.0.0 has no image.
- CI builds the image and starts it read-only on every pull request, so a difference between the CI checkout and the build context shows before a release.

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
