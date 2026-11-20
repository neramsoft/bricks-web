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
