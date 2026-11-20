import { proxyClient } from "@/lib/proxy-client";

/**
 * Whether a table code is unknown, for the proxy: the only way to answer an invalid QR code with a
 * real 404 status and the page's own body (docs/decisions/0003: Next cannot set a status from a
 * dynamic page without losing the body, so the proxy rewrites to `/~order-invalid` with 404, like
 * `/missing`). Anything but a clear "no such table" (an API that is slow, rate limiting, a module
 * that is off) is "not known to be invalid": the page decides.
 */
export async function isUnknownTable(token: string): Promise<boolean> {
  try {
    const result = await proxyClient().rest.GET("/v1/public/ordering/tables/{token}", {
      params: { path: { token } },
    });
    if (result.response.status !== 404) return false;
    return (result.error as { code?: string } | undefined)?.code === "ORDERING_TABLE_NOT_FOUND";
  } catch {
    return false;
  }
}

/** The token of a `/s/<token>` path, or null. */
export function tokenOf(pathname: string): string | null {
  const match = /^\/s\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return null;
  }
}
