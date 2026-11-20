// Pure part of docker/web-server.mjs, kept in src/ so a test can run it.
//
// Next's standalone `server.js` carries the whole build-time configuration as one line,
// `const nextConfig = {...}`. Of that, only `images.remotePatterns` and
// `images.dangerouslyAllowLocalIP` depend on an install's addresses (next.config.ts).

import type { MediaHost } from "./media-hosts.ts";

const CONFIG_LINE = /^const nextConfig = (\{.*\})$/m;

/**
 * Returns `source` with the image settings of its `nextConfig` replaced. Throws when the line is
 * not there (a Next version that writes `server.js` differently): the image must not start with
 * the build-time hosts by mistake.
 */
export function patchServerSource(
  source: string,
  images: { remotePatterns: MediaHost[]; dangerouslyAllowLocalIP: boolean },
): string {
  const match = CONFIG_LINE.exec(source);
  if (!match?.[1]) {
    throw new Error(
      "server.js has no `const nextConfig = {...}` line: this Next version needs server-patch.ts updated",
    );
  }
  const config = JSON.parse(match[1]) as { images?: Record<string, unknown> };
  config.images = {
    ...config.images,
    remotePatterns: images.remotePatterns,
    dangerouslyAllowLocalIP: images.dangerouslyAllowLocalIP,
  };
  // A function as the replacement: a string would have its `$` sequences interpreted.
  return source.replace(CONFIG_LINE, () => `const nextConfig = ${JSON.stringify(config)}`);
}

/**
 * Returns `source` with every `import.meta.url` replaced by `url`, so the module can be run from
 * memory (a `data:` URL) and still find `next` and its own folder as if it had been loaded from
 * `url`. This lets the image keep a read-only root file system: nothing is written beside
 * `server.js`. Throws when `import.meta.url` is not there (a Next version that locates itself
 * another way: the start-up wrapper must be updated, not guess).
 */
export function pinModuleUrl(source: string, url: string): string {
  if (!source.includes("import.meta.url")) {
    throw new Error(
      "server.js does not use import.meta.url: this Next version needs server-patch.ts updated",
    );
  }
  // A function as the replacement: a string would have its `$` sequences interpreted.
  return source.replaceAll("import.meta.url", () => JSON.stringify(url));
}
