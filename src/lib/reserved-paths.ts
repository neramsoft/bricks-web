/**
 * The top-level addresses that belong to the app, not to the CMS's pages: the proxy leaves them
 * alone, and a page can't be created there (the API reserves the same words). Add an entry here
 * AND to the matcher in src/proxy.ts for every new route outside the catch-all (a test compares
 * the two with the folders of src/app).
 */
export const RESERVED_PATHS = [
  "api",
  "preview",
  "missing",
  "robots.txt",
  "s",
  "sitemap.xml",
] as const;

/**
 * Reserved paths the proxy does see: it answers them itself (the table page, `/s/<token>`, gets a
 * header and no CMS lookup), so the matcher does not skip them.
 */
export const PROXY_HANDLED_PATHS: readonly string[] = ["s"];
