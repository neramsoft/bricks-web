import { z } from "zod";

// The website's settings, all from the environment and validated once.

const url = z
  .url()
  .refine((value) => /^https?:\/\//.test(value), "must be an http(s) address")
  .transform((value) => value.replace(/\/+$/, ""));

const schema = z.object({
  /** The CMS API's base address, without `/v1`. */
  API_URL: url,
  /**
   * The CMS API's public address (`https://api.bricks.ba`), for links a visitor's browser follows,
   * such as an event's calendar file. Defaults to `API_URL`, which is only right when that is
   * public too (in production it is usually an internal address).
   */
  PUBLIC_API_URL: url.optional(),
  /** The public origin of the site: canonical addresses, hreflang, the sitemap and JSON-LD. */
  SITE_URL: url,
  /**
   * The website connection's signing secret (`whsec_...`, shown once in the CMS admin under
   * Settings, Website connection). Verifies the revalidation webhook and signs what the site
   * sends to the CMS. Never sent to a browser.
   */
  REVALIDATE_SECRET: z.string().min(1).optional(),
  /** The host serving the CMS's media. Optional: the API's host is allowed anyway. */
  MEDIA_PUBLIC_URL: url.optional(),
  /**
   * How many reverse proxies in front of the site append to `X-Forwarded-For` (Caddy: 1). 0 (the
   * default) trusts no header.
   */
  TRUSTED_PROXY_HOPS: z
    .string()
    .regex(/^[0-5]$/, "must be a number from 0 to 5")
    .transform(Number)
    .default(0),
});

export type Env = z.infer<typeof schema>;

const DEV_DEFAULTS = { API_URL: "http://localhost:3001", SITE_URL: "http://localhost:3000" };

/**
 * Parses an environment. In production the API and site addresses are required; elsewhere the
 * development ports are the defaults. An empty value counts as unset. Throws one error that
 * lists every problem.
 */
export function parseEnv(source: Record<string, string | undefined>, production: boolean): Env {
  const raw: Record<string, string | undefined> = {};
  for (const key of Object.keys(schema.shape)) {
    const value = source[key]?.trim();
    raw[key] = value ? value : undefined;
  }
  if (!production) {
    raw.API_URL ??= DEV_DEFAULTS.API_URL;
    raw.SITE_URL ??= DEV_DEFAULTS.SITE_URL;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(`Invalid website settings: ${problems.join("; ")}`);
  }
  return result.data;
}

let cached: Env | undefined;

/** The validated environment of this process. */
export function env(): Env {
  cached ??= parseEnv(process.env, process.env.NODE_ENV === "production");
  return cached;
}
