import { createHmac, timingSafeEqual } from "node:crypto";
import { signFormVisit } from "@probiz/sdk";

// The website's signature of a form's visit, for a post from a browser without JavaScript
// (docs/decisions/0037 S1, 0040 S1). The page is cached (ISR) and holds no token, so the server
// component signs the second the page is rendered, with the website connection's secret, and puts
// the result (`t=<second>,v1=<hex>`, the SDK's `signFormVisit`) in a hidden field. The secret
// never leaves the server; the page holds a keyed hash of one second and one form id. When the
// post arrives, the route handler checks the field with the same secret and hands it to the API
// as `X-ProBiz-Site-Signature`: the API then judges the minimum fill time from `t`, instead of
// the site holding the request for three seconds. A browser that changes the field fails the check.

/** The name of the hidden field that holds the signed visit (starts with `_`, like the other site fields). */
export const VISIT_FIELD = "_visit";

/** How old a visit the API takes (docs/decisions/0037 S1: `SITE_SIGNATURE_MAX_AGE_SECONDS`, 24 hours). */
export const SIGNATURE_MAX_AGE_SECONDS = 24 * 60 * 60;
/** A visit this close to the API's limit is signed again, so it is still good when the API reads it. */
const SAFETY_SECONDS = 5 * 60;
/** The API takes a time up to a minute ahead of its clock (a difference between machines); more is not one of ours. */
const AHEAD_SECONDS = 60;

const SHAPE = /^t=([0-9]{9,11}),v1=([0-9a-f]{64})$/;
const MAX_LENGTH = 120;

/** The signed visit for a page rendered now, for its hidden field; null without a secret (the page then carries no field). */
export async function signedVisit(
  secret: string | undefined,
  formId: string,
  nowMs: number = Date.now(),
): Promise<string | null> {
  if (!secret) return null;
  return signFormVisit(secret, formId, new Date(Math.floor(nowMs / 1000) * 1000));
}

/**
 * The `t` of a field that we signed for this form, or null: not the shape of a signature, signed
 * with another secret or for another form, a changed `t` or `v1`, or a time more than a minute
 * ahead of this clock. The check is made with the same SDK function that signs, compared in
 * constant time.
 */
async function verified(
  secret: string,
  formId: string,
  raw: unknown,
  nowMs: number,
): Promise<number | null> {
  if (typeof raw !== "string" || raw.length > MAX_LENGTH) return null;
  const match = SHAPE.exec(raw);
  if (!match) return null;
  const t = Number(match[1]);
  if (t > Math.floor(nowMs / 1000) + AHEAD_SECONDS) return null;
  const expected = await signFormVisit(secret, formId, new Date(t * 1000));
  // Both are hashed first so the comparison takes the same time whatever the input.
  const digest = (value: string) => createHmac("sha256", "visit-compare").update(value).digest();
  return timingSafeEqual(digest(expected), digest(raw)) ? t : null;
}

/**
 * The `X-ProBiz-Site-Signature` value for a post, or null (no secret, no field, or a field that
 * fails the check: the post is then judged by the API's token). A field we signed, less than a day
 * old, goes on unchanged. One we signed that is older than the API's day (ISR keeps the last
 * render until someone asks again, so after a quiet weekend the first visitor gets a page that is
 * days old) is signed again with a time just inside the day: it needs a field this site made, so
 * a client cannot choose a time of its own; at most it replays the page's own, older, time, and
 * an older time only makes a post look slower than it was.
 */
export async function siteSignatureFor(input: {
  secret: string | undefined;
  formId: string;
  field: unknown;
  nowMs: number;
}): Promise<string | null> {
  if (!input.secret) return null;
  const t = await verified(input.secret, input.formId, input.field, input.nowMs);
  if (t === null) return null;
  const now = Math.floor(input.nowMs / 1000);
  const oldest = now - SIGNATURE_MAX_AGE_SECONDS + SAFETY_SECONDS;
  if (t >= oldest) return input.field as string;
  return signFormVisit(input.secret, input.formId, new Date(oldest * 1000));
}
