# syntax=docker/dockerfile:1.7
# The Bricks website: Next.js standalone output. Build from the repository root:
#   docker build --secret id=npm_token,env=NPM_TOKEN --build-arg SITE_VERSION=1.0.0 \
#     -t ghcr.io/neramsoft/bricks-site:1.0.0 .
#
# The SDK comes from GitHub Packages, a private registry, so the install needs a token with
# read:packages. It is passed as a BuildKit secret (never a build argument) and exists only for
# the install command: no layer holds it. Nothing else secret is needed to build, and nothing
# install-specific is baked in: the settings are read from the environment when the server runs
# (.env.example): API_URL and SITE_URL (required), REVALIDATE_SECRET, PUBLIC_API_URL, MEDIA_PUBLIC_URL,
# TRUSTED_PROXY_HOPS. The one thing Next fixes at build time that depends on them, the hosts
# next/image may fetch media from, is replaced when the container starts (docker/web-server.mjs).

# Base image; override to use a registry mirror. Keep the major equal to .nvmrc.
ARG NODE_IMAGE=node:24.22.1-alpine

# hadolint ignore=DL3006
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=true
# corepack reads the pnpm version from package.json ("packageManager").
RUN corepack enable
WORKDIR /repo

# Dependencies only, from the manifests, so a source change reuses this layer.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    --mount=type=secret,id=npm_token \
    NPM_TOKEN="$(cat /run/secrets/npm_token)" pnpm install --frozen-lockfile

FROM deps AS build
# Named files and folders only, never `COPY . .`.
COPY tsconfig.json next.config.ts postcss.config.mjs ./
COPY public public
COPY src src
# No API_URL, SITE_URL or secret is set: pages are rendered on their first request, not at build time.
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
RUN pnpm build \
 && grep -q '^const nextConfig = {' .next/standalone/server.js

# hadolint ignore=DL3006
FROM ${NODE_IMAGE} AS runtime
# tini: forwards signals (so `docker stop` is prompt) and reaps children.
# Unpinned on purpose: a rebuild picks up Alpine security updates.
# hadolint ignore=DL3018
RUN apk add --no-cache tini
ARG SITE_VERSION=0.0.0-dev
# The lowest ProBiz CMS version this site needs (CLAUDE.md, README.md). deploy-site reads this
# label from the pulled image and refuses an image without it (ProBiz CMS docs/runbook/client-site.md).
# Raise it together with CLAUDE.md, README.md and the SDK range in package.json.
ARG MIN_CMS_VERSION=1.0.0
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    SITE_VERSION=${SITE_VERSION} \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
# Next's cache (rendered pages, the image optimiser) is written to .next/cache: the node user owns it.
COPY --from=build --chown=node:node /repo/.next/standalone ./
COPY --from=build --chown=node:node /repo/.next/static ./.next/static
COPY --from=build --chown=node:node /repo/public ./public
# The start-up wrapper and what it imports (plain Node strips the types). The wrapper keeps the
# patched server.js in memory, so the container can run with a read-only root file system
# (deploy/compose.yml): Next writes only to .next/cache and .next/server/route-cache.
COPY --chown=node:node docker/web-server.mjs ./web-server.mjs
COPY --chown=node:node src/lib/media-hosts.ts src/lib/server-patch.ts ./
RUN mkdir -p .next/cache && chown node:node .next/cache
USER node
EXPOSE 3000
# /api/health answers from this process alone (no API call), so a restarting API does not make
# the website unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/health" || exit 1
ENTRYPOINT ["tini", "--"]
CMD ["node", "web-server.mjs"]
LABEL org.opencontainers.image.title="Bricks website" \
      org.opencontainers.image.vendor="Bricks" \
      org.opencontainers.image.source="https://github.com/neramsoft/bricks-web" \
      org.opencontainers.image.version="${SITE_VERSION}" \
      org.probiz.min-cms-version="${MIN_CMS_VERSION}"
