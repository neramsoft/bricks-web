import { revalidatePath, revalidateTag } from "next/cache";
import { getSite, parseRevalidationEvent, verifyWebhook } from "@probiz/sdk";
import { cmsUncached } from "@/lib/api";
import { env } from "@/lib/env";
import { clearProxyState } from "@/lib/proxy-state";
import { planRevalidation } from "@/lib/revalidation";

// The CMS webhook. The signature is checked on the raw body with
// the website connection's secret before anything is read from it. Never cached.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = env().REVALIDATE_SECRET;
  if (!secret) {
    return Response.json({ error: "REVALIDATE_SECRET is not set" }, { status: 503 });
  }
  const body = await request.text();
  const valid = await verifyWebhook(request.headers.get("x-probiz-signature"), body, secret);
  if (!valid) return Response.json({ error: "Invalid signature" }, { status: 401 });

  let event;
  try {
    event = parseRevalidationEvent(body);
  } catch {
    return Response.json({ error: "Not a ProBiz event" }, { status: 400 });
  }

  // The languages decide which addresses carry a prefix. If the API can't be asked, the CMS
  // should try again later: 503 makes its queue retry.
  let plan;
  try {
    const site = await getSite(cmsUncached());
    plan = planRevalidation(event, {
      defaultLocale: site.defaultLocale,
      locales: site.languages.map((language) => language.code),
    });
  } catch {
    return Response.json({ error: "The CMS did not answer" }, { status: 503 });
  }

  // { expire: 0 }: the next reader gets fresh content, never the stale version.
  for (const tag of plan.tags) revalidateTag(tag, { expire: 0 });
  for (const path of plan.paths) revalidatePath(path);
  // The proxy's memory of redirect lookups and languages follows the same events.
  if (plan.tags.length > 0 || plan.paths.length > 0) clearProxyState();
  if (plan.all || plan.layout) revalidatePath("/", "layout");

  return Response.json({ revalidated: true, type: event.type, tags: plan.tags, paths: plan.paths });
}
