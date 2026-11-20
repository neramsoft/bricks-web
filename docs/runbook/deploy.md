# Deploying the Bricks website

The website (`bricks.ba`) is its own Docker image, `ghcr.io/neramsoft/bricks-site`, built by this repository and run by hand on the Bricks VPS next to ProBiz CMS. It is never deployed together with the CMS and GitHub never logs in to the server. The contract with the CMS side is ProBiz CMS `docs/runbook/client-site.md` (read it first; this page uses its steps with Bricks's values) and its decision `docs/decisions/0054-client-sites-and-installs.md` (S2 to S5). The foundation decisions are `docs/decisions/0001-foundation.md` (F9).

## Bricks's values

| What                            | Value                                                          |
| ------------------------------- | -------------------------------------------------------------- |
| Website                         | `https://bricks.ba` (`www.bricks.ba` redirects to it, 301)     |
| CMS admin and API               | `https://admin.bricks.ba`, `https://api.bricks.ba`             |
| Media                           | `https://media.bricks.ba`                                      |
| Site folder on the server       | `/srv/probiz/sites/bricks/` (Compose project `bricks`)         |
| Compose service, Caddy upstream | `bricks-site` (`bricks-site:3000`)                             |
| Image                           | `ghcr.io/neramsoft/bricks-site:X.Y.Z` (`X.Y` and `latest` too) |
| Caddy file                      | `/srv/probiz/deploy/caddy-sites/bricks.caddy`                  |
| Lowest CMS version              | 1.0.0 (image label `org.probiz.min-cms-version`)               |
| Deploy command                  | `sudo /srv/probiz/bin/deploy-site bricks X.Y.Z`                |

What is in `deploy/` of this repository, and where it goes on the server:

| File                  | Server                                        |
| --------------------- | --------------------------------------------- |
| `deploy/compose.yml`  | `/srv/probiz/sites/bricks/compose.yml`        |
| `deploy/.env.example` | `/srv/probiz/sites/bricks/.env` (filled in)   |
| `deploy/bricks.caddy` | `/srv/probiz/deploy/caddy-sites/bricks.caddy` |

The files are copied by hand, **from the release tag you deploy**, so the Compose file matches the image. A checkout of the tag (`git clone --branch v1.0.0 --depth 1 https://github.com/neramsoft/bricks-web`) or the files of the GitHub tag are both fine; the repository is private, so use a deploy key or copy the three files from your computer with `scp`.

## How it fits together

- The container is on the CMS's Docker network `probiz-edge` and on no other. Caddy is on it too and reaches the site as `bricks-site:3000`. The site cannot reach the CMS's Postgres or Redis.
- **The CMS's API is not on `probiz-edge`.** The site reads it through its public address, `API_URL=https://api.bricks.ba` (through Caddy and Cloudflare, the path a browser takes). `http://api:3001` does not work from this container. This settles the open question of the plan: the public address is used.
- The browser sends table orders straight to `PUBLIC_API_URL` (`https://api.bricks.ba`), not through the site's server (decisions 0001 F7, 0003 T6). The API's CORS allows `SITE_URL`, which it takes from its own `.env`.
- The CMS tells the site when content changes with a signed webhook (`POST https://bricks.ba/api/revalidate`, secret `REVALIDATE_SECRET`). Without the secret the pages refresh on their timer only.
- The release in use is `SITE_RELEASE` in the site's `.env`. `deploy-site` writes it; nobody edits it by hand during a deploy.

### Content-Security-Policy

The CMS's Caddy snippet `website_headers` (`deploy/Caddyfile` of the CMS) sets `Content-Security-Policy: object-src 'none'; base-uri 'self'; frame-ancestors 'self'` when the app has not set one. It has no `default-src`, `connect-src`, `img-src`, `font-src`, `style-src` or `script-src`, so it blocks nothing this site needs:

- the browser's `fetch` to `https://api.bricks.ba` (table ordering, the SSE stream) is not limited (`connect-src` is absent);
- images come from this origin through `/_next/image` (the server fetches `media.bricks.ba` itself), and the fonts are self-hosted;
- the inline JSON-LD and Next's inline scripts are allowed (`script-src` is absent);
- the site shows no frames and no third-party script, and the three directives are met: it has no `<object>`, no `<base>`, and is framed by nobody (Next sends `X-Frame-Options: SAMEORIGIN`).

So `bricks.caddy` imports the snippet unchanged and the site sets no CSP of its own. If the CMS ever adds a `connect-src`, `img-src` or `script-src` to `website_headers`, this site needs `connect-src 'self' https://api.bricks.ba`, `img-src 'self' data: https://media.bricks.ba`, `font-src 'self'`, `style-src 'self' 'unsafe-inline'` and `script-src 'self' 'unsafe-inline'`; then replace the import in `bricks.caddy` with the site's own `header Content-Security-Policy ...` line. Until then, do not.

### Read-only root file system

`deploy/compose.yml` runs the container with `read_only: true`, `cap_drop: [ALL]` and `no-new-privileges`. The standalone server was run as an unprivileged user on a read-only tree and traced: it writes only to

- `/app/.next/cache` (the results of the site's calls to the CMS and the optimised images) and
- `/app/.next/server/route-cache` (the rendered pages of ISR),

both mounted as `tmpfs` owned by the image's `node` user (uid 1000), plus `/tmp` (nothing was seen to use it; it is there for the libraries). `docker/web-server.mjs` used to write a patched `server.runtime.mjs` beside `server.js`; it now runs the patched text from memory. A `tmpfs` is memory and counts against `mem_limit` (`SITE_MEMORY`, 1 GB by default; the three mounts are capped at 352 MB together); the caches are empty after a restart and fill again. When Next is upgraded, run the check again (the release workflow starts the image with the same flags, which catches a write at start-up, not a write on a later request): a write somewhere else shows as `EROFS` in `docker compose logs`.

## First deploy

You need: the CMS running at 1.0.0 or later, `docker login ghcr.io` done for **root** on the server (the login `upgrade.sh` uses), and DNS for `bricks.ba` and `www.bricks.ba` pointing at the server. Steps 3 to 5 need the image to exist, so release first (below) if no tag was built yet.

1. **GitHub: the image and the bot.**
   - The first push of `bricks-site` (by the release workflow, with `GITHUB_TOKEN`) creates the package under the repository `neramsoft/bricks-web` and gives that repository **Write** on it. To check: the package's settings, "Manage Actions access" lists `neramsoft/bricks-web` with the role Write. If it does not (a package that existed before, or one pushed by hand), add it.
   - The server pulls with the bot `skymedia-probiz-bot` (the account of the CMS's registry login): in the same package's settings, "Manage access", give it **Read**. Check on the server: `sudo docker pull ghcr.io/neramsoft/bricks-site:1.0.0`.
   - For the CI and the image build the repository needs **Read** on the two packages `@neramsoft/probiz-sdk` and `@neramsoft/probiz-blocks` (each package's "Manage Actions access"); the workflows use `GITHUB_TOKEN`, no personal token.

2. **Make the site's folder** on the server, as `probiz-ops`, and put the three files in it:

   ```
   sudo install -d -m 750 -o probiz-ops -g probiz-ops /srv/probiz/sites/bricks
   cd /srv/probiz/sites/bricks
   # from the checkout (or files) of the release tag, here v1.0.0:
   cp <repo>/deploy/compose.yml compose.yml
   cp <repo>/deploy/.env.example .env
   cp <repo>/deploy/bricks.caddy bricks.caddy
   chmod 600 .env
   ```

3. **Fill in `.env`.** `SITE_HOST=bricks.ba`, `API_URL=https://api.bricks.ba`, `PUBLIC_API_URL=https://api.bricks.ba`, `SITE_URL=https://bricks.ba`, `MEDIA_PUBLIC_URL=https://media.bricks.ba` and `TRUSTED_PROXY_HOPS=1` are already the example's values; check them against the CMS's `.env` (`MEDIA_PUBLIC_URL` must be the same address the API hands out in its links). Leave `SITE_RELEASE` out. Set `REVALIDATE_SECRET`: in **https://admin.bricks.ba, Settings, Website connection**, enter `https://bricks.ba` and choose "Generate secret" (shown once), then paste the same `whsec_...` value into `.env`. Without it the site works, but a change in the CMS appears only when the page's timer ends.

4. **Add the route to Caddy** and restart Caddy (its admin endpoint is off, so there is no reload; certificates stay):

   ```
   sudo cp /srv/probiz/sites/bricks/bricks.caddy /srv/probiz/deploy/caddy-sites/bricks.caddy
   cd /srv/probiz/deploy && sudo docker compose restart caddy
   ```

   `bricks.caddy` uses `{$SITE_HOST}`, the CMS's own `SITE_HOST`. It must be `bricks.ba`: check `grep ^SITE_HOST= /srv/probiz/deploy/.env`. (Were it different, write the domain out in `bricks.caddy`.) `upgrade.sh` keeps the file.

5. **Deploy**, with `deploy-site` when the server has it (next section) and by hand when it does not:

   ```
   sudo /srv/probiz/bin/deploy-site bricks 1.0.0
   ```

   The first request to a new domain makes Caddy get a certificate, which can outlast the smoke request. If the script rolls back only for that ("answered HTTP 000" or a TLS error in `/var/log/probiz/deploy-site.log`), run it again. Behind Cloudflare, add `--origin-ip 127.0.0.1`.

6. **Check** (the real installation, plan "Provjera"):

   ```
   curl -sI https://bricks.ba/            # 200
   curl -sI https://bricks.ba/en          # 200
   curl -s  https://bricks.ba/robots.txt  # names https://bricks.ba/sitemap.xml
   curl -sI https://bricks.ba/sitemap.xml # 200
   curl -s  https://bricks.ba/api/health  # {"status":"ok"}
   curl -sI https://www.bricks.ba/        # 301 to https://bricks.ba/
   curl -sI https://bricks.ba/ | grep -i content-security-policy
   ```

   Then in the admin, Settings, Website connection, send the **test** event (the site answers 200), and place one test order from a test table at `https://bricks.ba/s/<token>`; cancel it in the admin.

## `deploy-site` and the time before it exists on the server

`deploy-site` is a script of the CMS (`deploy/server/deploy-site.sh`, installed by `bootstrap.sh` as `/srv/probiz/bin/deploy-site`). It reaches an install that already runs CMS 1.0.0 only with **the next CMS release bundle** (1.0.1, through `upgrade.sh`); until that upgrade is done, `/srv/probiz/bin/deploy-site` does not exist on the Bricks server. Check with `ls -l /srv/probiz/bin/deploy-site`.

Until then, do the same steps by hand. They are what the script does (client-site.md, "Later deploys"), minus its lock, log and automatic rollback, so keep the old tag in mind and use `tmux`:

```
cd /srv/probiz/sites/bricks
NEW=1.0.0
OLD="$(sed -n 's/^SITE_RELEASE=//p' .env)"        # empty on the first deploy; write it down

# 1. pull the new image (the .env is not changed yet)
sudo SITE_RELEASE=$NEW docker compose pull

# 2. the image's minimum against the CMS (what deploy-site refuses on): the label...
sudo docker image inspect --format '{{index .Config.Labels "org.probiz.min-cms-version"}}' \
  ghcr.io/neramsoft/bricks-site:$NEW
#    ...and the running CMS, with the probe token of /srv/probiz/deploy/.env
curl -s -H "X-ProBiz-Probe: $(sed -n 's/^HEALTH_PROBE_TOKEN=//p' /srv/probiz/deploy/.env)" \
  https://api.bricks.ba/health
#    The CMS "version" must be at least the label. If it is not, stop and upgrade the CMS first.

# 3. write the release, start, wait for the container's health check
sudo sed -i '/^SITE_RELEASE=/d' .env && echo "SITE_RELEASE=$NEW" | sudo tee -a .env >/dev/null
sudo docker compose up -d --wait

# 4. the smoke request, through Caddy
curl -fsS https://bricks.ba/api/health
```

(`.env` is owned by `probiz-ops`; drop `sudo` from the `sed` and `tee` when you are that user.) If step 3 or 4 fails, go back: put `SITE_RELEASE=$OLD` in `.env` and run `docker compose up -d --wait` again; on a first deploy run `docker compose down` instead. Read `docker compose logs --tail 100`.

## Releasing a new version

1. Work lands on `development` by squash PRs (`feature/*`, `fix/*`). Each notable change is a line under `## [Unreleased]` in `CHANGELOG.md`.
2. **Release PR** `development` to `master`, merged with a **merge commit** (not squash). It raises `version` in `package.json` (X.Y.Z, digits only, since `deploy-site` accepts nothing else) and turns `## [Unreleased]` into `## [X.Y.Z] - date`, with a new empty `## [Unreleased]` above it. If the site started to use something a later CMS adds, raise the minimum together in `Dockerfile` (`ARG MIN_CMS_VERSION`), `README.md`, `CLAUDE.md` and the SDK range in `package.json` (CI checks the first two agree).
3. **Tag `master`**, after the PR is merged:

   ```
   git checkout master && git pull
   git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z
   ```

   The workflow `Release` checks that the tag's commit is on `master`, that the tag equals `package.json`'s version and that the `CHANGELOG.md` section exists, builds the image with the BuildKit secret `npm_token` (= `GITHUB_TOKEN`), starts it with the read-only flags, and pushes `ghcr.io/neramsoft/bricks-site:X.Y.Z`, `X.Y` and `latest`. The pushed image has no provenance or SBOM attestation (the same choice as the CMS's release). To try the build first: Actions, Release, "Run workflow", `dry_run` left on; it pushes nothing.

4. **Deploy** on the server: `sudo /srv/probiz/bin/deploy-site bricks X.Y.Z` (or the manual steps above). It refuses a site that needs a newer CMS than the one running (exit 6): upgrade the CMS first.
5. `hotfix/*` branches from `master`, merges to `master` and then back into `development`; tag `master` as above.

A tag that was pushed by mistake and has no image yet can be deleted (`git push origin :refs/tags/vX.Y.Z`); one whose image was pushed is not reused: release the next version.

## Rolling back

`deploy-site` puts the previous release back by itself when a deploy fails after the change (exit 1). To go back by hand to a version that was good, deploy it: `sudo /srv/probiz/bin/deploy-site bricks 1.0.0` (the CMS check runs again). The site has no database, so there is nothing else to undo. If the last deploy ended with exit 3, the site may be down: `cd /srv/probiz/sites/bricks && sudo docker compose ps`, `sudo docker compose logs --tail 100`, fix the cause and deploy a version that works. Without `deploy-site`: the manual steps above with the old tag as `NEW`.

Old images stay on the disk. Remove old site tags by name when it fills (`sudo docker image rm ghcr.io/neramsoft/bricks-site:1.0.0`), keep the previous one for a quick rollback, and never use `docker image prune -a` (it removes the CMS's previous release images, which `upgrade.sh` may need).

## Cloudflare

The apex and `www` are proxied (orange cloud) with SSL/TLS mode **Full (strict)**, as in the CMS's `docs/runbook/vps.md` ("The website's DNS and Cloudflare"). Do it in this order, because Full (strict) needs a valid certificate on the origin:

1. Create the `A` records for `bricks.ba` and `www.bricks.ba` (and `admin`, `api`, `media` as the CMS runbook says) **DNS only** (grey cloud), so Caddy can get its Let's Encrypt certificates.
2. Do the first deploy. Check that `https://bricks.ba/` answers with a valid certificate (`curl -sI https://bricks.ba/`) and that `https://www.bricks.ba/` redirects.
3. Switch both records to **Proxied** and set SSL/TLS to **Full (strict)**. Never "Flexible": Caddy redirects to https and the page would loop.
4. From then on use `--origin-ip 127.0.0.1` with `deploy-site`, so its requests go to Caddy on the server and not through Cloudflare.

Caddy takes the visitor's address from `CF-Connecting-IP` only for requests from Cloudflare's ranges, and sets `X-Forwarded-For` to it alone; that is why `TRUSTED_PROXY_HOPS=1` is right.

## When it fails

The table of messages is in the CMS's `docs/runbook/client-site.md` ("When it fails"). Besides:

| What you see                                      | Likely cause                                                                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Container restarts, logs say `API_URL is not set` | `.env` lacks `API_URL` or `SITE_URL` (Compose stops earlier with "set API_URL in .env" when the file is not found at all).                             |
| Pages show but images do not                      | `MEDIA_PUBLIC_URL` is not the media host the API puts in its links, so `next/image` refuses the host. The logs name the hosts it allows at start.      |
| A change in the CMS does not show                 | `REVALIDATE_SECRET` is empty or differs from the admin's, or the Website connection's address is not `https://bricks.ba`. Send the admin's test event. |
| Ordering fails in the browser, console shows CORS | The API's `SITE_URL` is not `https://bricks.ba`, or `PUBLIC_API_URL` is not an address the guest reaches.                                              |
| `EROFS` or `EACCES` in the logs                   | Something writes outside the `tmpfs` mounts of `compose.yml` (a Next upgrade); see "Read-only root file system".                                       |
