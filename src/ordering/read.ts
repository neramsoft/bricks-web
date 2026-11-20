import "server-only";
import { cache } from "react";
import { isProbizApiError } from "@probiz/sdk";
import { cmsUncached } from "@/lib/api";
import type { OrderingPage } from "./types";

// The table page's data (docs/decisions/0001 F5): read on the server for each visit with
// `cache: "no-store"`, because the menu follows the venue's overrides and the page says whether the
// venue takes orders now. React's `cache` shares the one read between the layout, the metadata and
// the page of a request.

export type TableResult =
  | { kind: "ok"; page: OrderingPage }
  | { kind: "not_found" }
  | { kind: "disabled" }
  | { kind: "busy" };

export const getTable = cache(async (token: string, locale: string): Promise<TableResult> => {
  try {
    const result = await cmsUncached().rest.GET("/v1/public/ordering/tables/{token}", {
      params: { path: { token }, query: locale ? { locale } : {} },
    });
    if (result.response.ok && result.data) return { kind: "ok", page: result.data };
    const body = (result.error ?? {}) as { code?: string; statusCode?: number };
    if (result.response.status === 404) {
      return { kind: body.code === "MODULE_DISABLED" ? "disabled" : "not_found" };
    }
    return { kind: "busy" };
  } catch (error) {
    // The API did not answer, or answered with something this page cannot read: the guest is told
    // to try again rather than shown an error page.
    if (isProbizApiError(error) && error.status === 404) return { kind: "not_found" };
    return { kind: "busy" };
  }
});
