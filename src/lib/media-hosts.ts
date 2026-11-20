// The hosts `next/image` may fetch CMS media from (docs/decisions/0030 B5). Pure, so the
// configuration (next.config.ts) and its tests share it.

export interface MediaHost {
  protocol: "http" | "https";
  hostname: string;
  port: string;
}

const PRIVATE_HOST =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[?::1\]?)$/;

/** True for a host on this machine or a private network. */
export const isPrivateHost = (hostname: string): boolean => PRIVATE_HOST.test(hostname);

/** Where `docker compose` serves the media bucket in development (the API's own default). */
export const DEV_MEDIA_URL = "http://localhost:9000";

function hostOf(value: string | undefined): MediaHost | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return {
      protocol: url.protocol === "https:" ? "https" : "http",
      hostname: url.hostname,
      port: url.port,
    };
  } catch {
    // A bad address is reported by the settings check at the first request.
    return null;
  }
}

/**
 * The API's host and the media storage's (`MEDIA_PUBLIC_URL`). With no `MEDIA_PUBLIC_URL` and an
 * API on this machine, the development storage is allowed too, because the API then hands out
 * its addresses (docs/decisions/0015).
 */
export function mediaHosts(source: {
  API_URL?: string | undefined;
  MEDIA_PUBLIC_URL?: string | undefined;
}): MediaHost[] {
  const api = hostOf(source.API_URL);
  const media = hostOf(source.MEDIA_PUBLIC_URL);
  const hosts = [api, media];
  if (!media && (!api || isPrivateHost(api.hostname))) hosts.push(hostOf(DEV_MEDIA_URL));
  const unique = new Map<string, MediaHost>();
  for (const host of hosts) {
    if (host) unique.set(`${host.protocol}://${host.hostname}:${host.port}`, host);
  }
  return [...unique.values()];
}

/**
 * `next/image` refuses to fetch from a private address unless told otherwise. Allowed only when
 * every host it may fetch from is private: a production site with a public media host keeps the
 * protection.
 */
export function allowLocalImages(hosts: readonly MediaHost[]): boolean {
  return hosts.length > 0 && hosts.every((host) => isPrivateHost(host.hostname));
}
