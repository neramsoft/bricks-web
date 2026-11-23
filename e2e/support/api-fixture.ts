import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { deflateSync } from "node:zlib";
import type { ApiComponents } from "@probiz/sdk";
import { buildFixtures, MEDIA_PATH, type Fixtures } from "./fixtures.ts";
import { advance, handleOrdering, newOrderingState } from "./ordering-fixture.ts";

// A small stand-in for the ProBiz CMS public API (docs/decisions/0001 F8): the endpoints this site
// reads, answering the typed fixtures, plus a log of what the site POSTs (form submissions, the
// 404 report) for the tests to read. The CI of this repository cannot pull the CMS's private
// images, and the run stays deterministic. Plain Node, no dependencies.

type S = ApiComponents["schemas"];

export interface Recorded {
  path: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface FixtureApi {
  server: Server;
  /** What was POSTed, oldest first. */
  posts: Recorded[];
  close(): Promise<void>;
}

// ---- a PNG for every picture, drawn here so the media needs no files ----

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

const hash = (name: string) =>
  [...name].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** A warm, dark picture whose colour follows its name; rows fade so a crop shows something. */
export function png(name: string, width: number, height: number): Buffer {
  const seed = hash(name);
  const base = [60 + (seed % 90), 40 + ((seed >> 3) % 50), 30 + ((seed >> 5) % 40)];
  const rows = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const fade = 0.55 + 0.45 * (y / height);
    const offset = y * (width * 3 + 1);
    for (let x = 0; x < width; x += 1) {
      const glow = 1 + 0.25 * Math.sin((x / width) * Math.PI * 2 + (seed % 7));
      for (let channel = 0; channel < 3; channel += 1) {
        rows[offset + 1 + x * 3 + channel] = Math.min(
          255,
          Math.round(base[channel]! * fade * glow),
        );
      }
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- the API ----

const error = (statusCode: number, code: string, message: string, extra: object = {}) => ({
  statusCode,
  code,
  message,
  ...extra,
});

/** The origins the site is served from in the tests (SITE_URL of the web server). */
const SITE_ORIGINS = ["http://127.0.0.1:4011", "http://localhost:4011"];

const ROBOTS = "User-agent: *\nAllow: /\n\nSitemap: http://127.0.0.1:4011/sitemap.xml\n";

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    request.on("data", (part) => (data += part));
    request.on("end", () => resolve(data));
  });
}

const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;

/** The CMS's checks of the reservation form's values, in its error shape. */
export function validateReservation(values: Record<string, unknown>) {
  const issues: Array<{
    path: string;
    code: string;
    message: string;
    minimum?: number;
    maximum?: number;
  }> = [];
  const need = (key: string, ok: boolean, code = "required") => {
    if (!ok) issues.push({ path: `values.${key}`, code, message: code });
  };
  need("ime", typeof values.ime === "string" && values.ime.trim() !== "");
  need("telefon", typeof values.telefon === "string" && values.telefon.trim() !== "");
  need("kad", typeof values.kad === "string" && values.kad.trim() !== "");
  if (typeof values.kad === "string" && values.kad !== "") {
    need("kad", DATETIME.test(values.kad), "invalid_date");
  }
  need("osobe", typeof values.osobe === "number" && values.osobe >= 1 && values.osobe <= 12);
  return issues;
}

export async function startFixtureApi(port: number, host = "127.0.0.1"): Promise<FixtureApi> {
  const mediaBase = `http://${host}:${port}`;
  const posts: Recorded[] = [];
  const ordering = newOrderingState();

  const respond = (
    response: ServerResponse,
    status: number,
    body: unknown,
    type = "application/json",
  ) => {
    response.writeHead(status, { "content-type": type, "cache-control": "no-store" });
    response.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", mediaBase);
    const path = url.pathname;
    // CORS as the CMS's: the site's origin only (SITE_URL), any requested header, Retry-After readable.
    const origin = String(request.headers.origin ?? "");
    if (SITE_ORIGINS.includes(origin)) {
      response.setHeader("access-control-allow-origin", origin);
      response.setHeader("vary", "Origin");
      response.setHeader("access-control-expose-headers", "Retry-After");
    }
    if (request.method === "OPTIONS") {
      response.writeHead(
        SITE_ORIGINS.includes(origin) ? 204 : 403,
        SITE_ORIGINS.includes(origin)
          ? {
              "access-control-allow-methods": "GET,POST,OPTIONS",
              "access-control-allow-headers": String(
                request.headers["access-control-request-headers"] ?? "",
              ),
            }
          : {},
      );
      return response.end();
    }
    const locale = url.searchParams.get("locale") ?? "bs";
    // Fresh dates and hours on every answer: "open now" and "next event" follow the real clock.
    const fixtures: Fixtures = buildFixtures(mediaBase);
    const json = (status: number, body: unknown) => respond(response, status, body);
    const sendWith = (status: number, body: unknown, headers: Record<string, string> = {}) => {
      for (const [key, value] of Object.entries(headers)) response.setHeader(key, value);
      respond(response, status, body);
    };

    if (request.method === "GET" && path.startsWith(`${MEDIA_PATH}/`)) {
      // A variant: /media/<name>/w<width>.webp|avif?h=<height> (PNG bytes; a browser sniffs them).
      const variant = /^\/media\/([^/]+)\/w(\d+)\.(webp|avif)$/.exec(path);
      if (variant) {
        const width = Math.min(Number(variant[2]), 1600);
        const height = Math.min(Number(url.searchParams.get("h")) || 600, 1600);
        response.writeHead(200, {
          "content-type": `image/${variant[3]}`,
          "cache-control": "public, max-age=31536000, immutable",
        });
        return response.end(png(variant[1]!, width, height));
      }
      const name = path.slice(MEDIA_PATH.length + 1).replace(/\.png$/, "");
      const width = Math.min(Number(url.searchParams.get("w")) || 800, 1600);
      const height = Math.min(Number(url.searchParams.get("h")) || 600, 1600);
      return respond(response, 200, png(name, width, height), "image/png");
    }

    if (path === "/__posts") return json(200, posts);
    if (path === "/__reset") {
      posts.length = 0;
      Object.assign(ordering, newOrderingState());
      return json(200, { ok: true });
    }
    if (path === "/__ordering/advance") {
      advance(
        ordering,
        (url.searchParams.get("to") as never) ?? null,
        url.searchParams.get("reason"),
      );
      return json(200, { ok: true });
    }
    if (path === "/__ordering/sse") {
      ordering.sseDown = url.searchParams.get("down") === "1";
      return json(200, { ok: true });
    }

    if (request.method === "POST") {
      const raw = await readBody(request);
      let body: unknown = raw;
      try {
        body = JSON.parse(raw);
      } catch {
        // Not JSON: recorded as text.
      }
      const headers = Object.fromEntries(
        Object.entries(request.headers).map(([key, value]) => [key, String(value)]),
      );
      posts.push({ path: `${path}${url.search}`, headers, body });

      if (handleOrdering(ordering, request, path, locale, body, sendWith, response)) {
        return;
      }

      const submission = /^\/v1\/public\/forms\/([^/]+)\/submissions$/.exec(path);
      if (submission) {
        if (submission[1] !== fixtures.form.id)
          return json(404, error(404, "NOT_FOUND", "No such form"));
        const values = (body as { values?: Record<string, unknown> }).values ?? {};
        if (!headers["x-probiz-site-signature"] && !(body as { token?: string }).token) {
          return json(400, error(400, "FORM_TOKEN_REQUIRED", "A token is needed"));
        }
        const issues = validateReservation(values);
        if (issues.length > 0) {
          return json(400, error(400, "VALIDATION_FAILED", "The form has problems", { issues }));
        }
        return json(201, {
          message: "Hvala, primili smo rezervaciju.",
        } satisfies S["PublicFormSubmitted"]);
      }
      if (path === "/v1/public/not-found") {
        return json(200, { reason: null, logged: true } satisfies S["NotFoundReported"]);
      }
      return json(404, error(404, "NOT_FOUND", "No such endpoint"));
    }

    if (request.method !== "GET") return json(405, error(405, "METHOD_NOT_ALLOWED", "No"));
    if (handleOrdering(ordering, request, path, locale, undefined, sendWith, response)) return;

    switch (path) {
      case "/v1/public/site":
        return json(200, fixtures.site(locale));
      case "/v1/public/menus":
        return json(200, fixtures.menus(locale));
      case "/v1/public/modules":
        return json(200, {
          modules: ["menu", "events", "locations", "gallery", "forms", "ordering"],
        });
      case "/v1/public/paths": {
        const items: S["PublicPath"][] = [...fixtures.pages.keys()].map((key) => {
          const [pageLocale, ...rest] = key.split(":");
          return { locale: pageLocale!, path: rest.join(":"), type: "page" };
        });
        return json(200, { items, nextCursor: null } satisfies S["PublicPathsPage"]);
      }
      case "/v1/public/pages": {
        const page = fixtures.pages.get(`${locale}:${url.searchParams.get("path") ?? "/"}`);
        return page ? json(200, page) : json(404, error(404, "NOT_FOUND", "No such page"));
      }
      case "/v1/public/pages/sitemap": {
        const items: S["PublicSitemapItem"][] = [...fixtures.pages.values()].map((page) => ({
          type: "page",
          lastmod: page.updatedAt,
          alternates: page.alternates,
          images: [],
          locale: page.locale,
          path: page.path,
          href: page.href,
        }));
        return json(200, { items, nextCursor: null, generatedAt: new Date().toISOString() });
      }
      case "/v1/public/robots":
        return respond(response, 200, ROBOTS, "text/plain");
      case "/v1/public/redirects/resolve":
        return json(404, error(404, "NOT_FOUND", "No redirect"));
      case "/v1/public/locations":
        return json(200, {
          items: fixtures.locations,
          nextCursor: null,
          total: fixtures.locations.length,
        });
      case "/v1/public/events":
        return json(200, {
          items: fixtures.events,
          nextCursor: null,
          total: fixtures.events.length,
        });
    }

    const detail = /^\/v1\/public\/events\/by-slug\/([^/]+)$/.exec(path);
    if (detail) {
      const summary = fixtures.events.find((e) => e.href?.endsWith(`/${detail[1]}`));
      if (!summary) return json(404, error(404, "NOT_FOUND", "No such event"));
      // Only what the site reads of the full event: its name and its performers.
      const performers: S["PublicEventPerformer"][] = [
        {
          id: "00000000-0000-4000-8000-000000005001",
          role: null,
          image: null,
          href: null,
          name: "Duo Slatina",
        },
        {
          id: "00000000-0000-4000-8000-000000005002",
          role: null,
          image: null,
          href: null,
          name: "Amar Hodžić",
        },
      ];
      return json(200, { ...summary, slug: detail[1], performers });
    }
    const ics = /^\/v1\/public\/events\/([^/]+)\/ics$/.exec(path);
    if (ics) {
      return respond(
        response,
        200,
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n",
        "text/calendar",
      );
    }

    const form = /^\/v1\/public\/forms\/([^/]+)(\/token)?$/.exec(path);
    if (form) {
      if (form[1] !== fixtures.form.id) return json(404, error(404, "NOT_FOUND", "No such form"));
      if (form[2]) {
        return json(200, {
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          minFillSeconds: 0,
          token: "fixture-token",
        } satisfies S["PublicFormToken"]);
      }
      return json(200, fixtures.form);
    }
    return json(404, error(404, "NOT_FOUND", `No such endpoint: ${path}`));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  return {
    server,
    posts,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
