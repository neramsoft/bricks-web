// Addresses that scanners and crawlers ask for and this site never serves: `/.well-known/*`
// (ard.json, security.txt, ...), dotfiles (`/.env`, `/.git/config`) and files of a kind the site
// has none of (`/wp-login.php`, `/backup.zip`, `/config.json`). The proxy answers them with a
// tiny plain 404 before anything else: no CMS call, no page render, and no report to the CMS's
// 404 log (a scanner's guess is not a broken link of the site). A page of the CMS never has a
// dot in its address, so none of these is a page.

/** The files the app serves itself under one of the listed extensions. */
const SERVED = new Set(["/robots.txt", "/sitemap.xml", "/llms.txt"]);

/** Extensions of files this site has none of. Keep it in step with the second matcher of src/proxy.ts. */
export const BOT_EXTENSIONS = [
  "php",
  "php3",
  "php4",
  "php5",
  "php7",
  "phtml",
  "phps",
  "asp",
  "aspx",
  "ashx",
  "asmx",
  "jsp",
  "jspx",
  "cgi",
  "pl",
  "py",
  "sh",
  "exe",
  "dll",
  "env",
  "ini",
  "cfg",
  "conf",
  "config",
  "yml",
  "yaml",
  "toml",
  "json",
  "xml",
  "txt",
  "md",
  "csv",
  "sql",
  "db",
  "sqlite",
  "bak",
  "old",
  "orig",
  "swp",
  "log",
  "zip",
  "gz",
  "tgz",
  "tar",
  "rar",
  "7z",
  "pem",
  "key",
] as const;

const EXTENSION = new RegExp(`\\.(?:${BOT_EXTENSIONS.join("|")})$`, "i");

/** Whether the address is one the site never serves and the proxy answers with a plain 404. */
export function isBotPath(pathname: string): boolean {
  if (SERVED.has(pathname)) return false;
  // Next's own files and the app's API are not guesses.
  if (/^\/(?:_next|api)(?:\/|$)/.test(pathname)) return false;
  const segments = pathname.split("/").filter(Boolean);
  // `/.well-known/...`, `/.env`, `/en/.git/config`: a segment that starts with a dot.
  if (segments.some((segment) => segment.startsWith("."))) return true;
  const last = segments[segments.length - 1];
  return last !== undefined && EXTENSION.test(last);
}

/** The files the app serves itself although their extension is a bot one. */
export function isServedFile(pathname: string): boolean {
  return SERVED.has(pathname);
}
