/**
 * The top-level addresses that belong to the app, not to the CMS's pages: the proxy leaves them
 * alone, and a page can't be created there (the API reserves the same words). Add an entry here
 * AND to the matcher in src/proxy.ts for every new route outside the catch-all (a test compares
 * the two with the folders of src/app).
 */
export const RESERVED_PATHS = ["api", "preview", "missing", "robots.txt", "sitemap.xml"] as const;
