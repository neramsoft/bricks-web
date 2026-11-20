import { getFormData } from "@/lib/data";
import { env } from "@/lib/env";
import { formDataLimited } from "@/forms/body-limit";
import { type FormOutcome, outcomeStatus, outcomeWord } from "@/forms/outcome";
import { cleanAnchor, isSameOrigin } from "@/forms/request";
import { FIELD, sendSubmission } from "@/forms/submit";

// Where a form posts. Two ways in, one handler:
//  - the page's script posts with `Accept: application/json` and gets the outcome as JSON;
//  - a browser without script posts the form itself and gets a 303 to the thank-you page
//    (src/app/~form), which names the outcome in its address; nothing private is in it.
// Never cached, never indexed.
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } as const;
/** A reservation is a few short lines: far less than this. */
const MAX_BODY = 64 * 1024;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");
  const refuse = (status: number, text: string) =>
    wantsJson
      ? Response.json(
          { outcome: { status: "failed", kind: "unavailable" } },
          { status, headers: NO_STORE },
        )
      : new Response(text, { status, headers: { ...NO_STORE, "Content-Type": "text/plain" } });

  if (!UUID.test(id)) return refuse(404, "Not found");
  if (!isSameOrigin(request.headers, new URL(env().SITE_URL).origin)) {
    return refuse(403, "Forbidden");
  }
  let data: FormData;
  try {
    const read = await formDataLimited(request, MAX_BODY);
    if ("reason" in read) return refuse(413, "Payload too large");
    data = read.data;
  } catch {
    return refuse(400, "Bad request");
  }

  const back = (outcome: FormOutcome, path: string | null) => {
    const lang = String(data.get(FIELD.lang) ?? "").slice(0, 8);
    const target = new URL(
      /^[a-z]{2,3}$/i.test(lang) ? `/~form/${lang}` : "/~form",
      env().SITE_URL,
    );
    target.searchParams.set("s", outcomeWord(outcome));
    if (path) target.searchParams.set("r", path);
    const anchor = cleanAnchor(data.get(FIELD.anchor));
    if (anchor) target.searchParams.set("a", anchor);
    return new Response(null, {
      status: 303,
      headers: { ...NO_STORE, Location: `${target.pathname}${target.search}` },
    });
  };

  const form = await getFormData(id).catch(() => null);
  if (!form) {
    const outcome: FormOutcome = { status: "failed", kind: "not_found" };
    return wantsJson
      ? Response.json({ outcome }, { status: 404, headers: NO_STORE })
      : back(outcome, null);
  }

  const submission = await sendSubmission({ form, data, headers: request.headers });
  if (wantsJson) {
    return Response.json(
      { outcome: submission.outcome },
      { status: outcomeStatus(submission.outcome), headers: NO_STORE },
    );
  }
  return back(submission.outcome, submission.path);
}
