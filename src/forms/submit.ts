import "server-only";
import {
  createProbizClient,
  formErrorOf,
  formValuesFromFormData,
  getFormToken,
  submitForm,
  type FormDataLike,
  type ProbizClient,
  type PublicForm,
} from "@probiz/sdk";
import { env } from "@/lib/env";
import { problemsFrom } from "./errors";
import { honeypotName } from "./submit-shared";
import type { EnteredValues, FailureKind, FormOutcome } from "./outcome";
import { cleanPagePath, visitorAddress, visitorAgent } from "./request";
import { siteSignatureFor, VISIT_FIELD } from "./site-visit";

// Sending a form for a visitor: one function for both ways in (the page's script, and a browser
// without script). The page carries the time it was rendered, signed with the website
// connection's secret (`_visit`): the site checks it and the API judges the fill time from it, so
// nothing here waits. Nothing here reads a header the visitor could have set for himself, except
// the browser's name.

/** The names of the hidden fields the page adds to a form: they start with `_`, which no field key can. */
export const FIELD = {
  captcha: "_captcha",
  returnPath: "_return",
  anchor: "_anchor",
  lang: "_lang",
} as const;

/** What the visitor typed, by the form's definition, to put back after an error. */
export function enteredValues(
  form: Pick<PublicForm, "fields">,
  data: FormDataLike & { get(name: string): unknown },
): EnteredValues {
  const values: EnteredValues = {};
  for (const field of form.fields) {
    if (field.type === "checkboxes") {
      const chosen = data.getAll(field.key).filter((v): v is string => typeof v === "string");
      if (chosen.length > 0) values[field.key] = chosen;
    } else if (field.type === "consent") {
      if (data.get(field.key) === "on" || data.get(field.key) === "true") values[field.key] = true;
    } else {
      const raw = data.get(field.key);
      if (typeof raw === "string" && raw !== "") values[field.key] = raw;
    }
  }
  return values;
}

/**
 * What goes to the API with a visitor's request, instead of his own headers: his address (when it
 * can be known) as the one `X-Forwarded-For` value, and his browser. The API trusts what a site it
 * trusts says (its TRUST_PROXY), so the address is the one chosen here.
 */
export function visitorHeaders(headers: Pick<Headers, "get">): Record<string, string> {
  const address = visitorAddress(headers, env().TRUSTED_PROXY_HOPS ?? 0);
  const agent = visitorAgent(headers);
  return {
    ...(address ? { "x-forwarded-for": address } : {}),
    ...(agent ? { "user-agent": agent } : {}),
  };
}

/** The API's client for one visitor: his address (when it can be known) and browser go with each call. */
export function clientFor(headers: Pick<Headers, "get">): ProbizClient {
  const forwarded = visitorHeaders(headers);
  return createProbizClient({
    baseUrl: env().API_URL,
    fetch: (input) => {
      const request = input as Request;
      // One value, never the visitor's own header passed on.
      request.headers.delete("x-forwarded-for");
      for (const [name, value] of Object.entries(forwarded)) request.headers.set(name, value);
      return fetch(request, { cache: "no-store" });
    },
  });
}

export interface Submission {
  outcome: FormOutcome;
  values: EnteredValues;
  /** The page the form was on, when the field held a usable path. */
  path: string | null;
}

/** Sends one submission. Never throws: every failure is an outcome the page can show. */
export async function sendSubmission(input: {
  form: PublicForm;
  data: FormData;
  headers: Pick<Headers, "get">;
}): Promise<Submission> {
  const { form, data } = input;
  const path = cleanPagePath(data.get(FIELD.returnPath));
  const values = enteredValues(form, data);
  const failed = (kind: FailureKind, retryAfterSec?: number): Submission => ({
    outcome: {
      status: "failed",
      kind,
      ...(retryAfterSec !== undefined ? { retryAfterSec } : {}),
    },
    values,
    path,
  });

  const captchaToken = data.get(FIELD.captcha);
  // The human check can only be answered by the provider's script, which this site does not load:
  // say why, and spare the API a call it would refuse.
  if (form.captcha && !(typeof captchaToken === "string" && captchaToken)) {
    return failed("js_required");
  }
  const honeypot = data.get(honeypotName(form));
  const trapped = typeof honeypot === "string" && honeypot !== "";
  const client = clientFor(input.headers);

  try {
    // A post is judged by the page's render time, which only the site can vouch for (the
    // signature). Without a good one the API gets a fresh token and judges the post by it: it is
    // too fast and is filed as spam, never held in this request.
    const siteSignature =
      (await siteSignatureFor({
        secret: env().REVALIDATE_SECRET,
        formId: form.id,
        field: data.get(VISIT_FIELD),
        nowMs: Date.now(),
      })) ?? undefined;
    const token = siteSignature ? undefined : (await getFormToken(client, form.id)).token;
    const done = await submitForm(
      client,
      form.id,
      {
        values: formValuesFromFormData(form, data),
        ...(token ? { token } : {}),
        ...(typeof captchaToken === "string" && captchaToken ? { captchaToken } : {}),
        ...(path ? { pagePath: path } : {}),
        ...(trapped ? { website: honeypot } : {}),
      },
      siteSignature ? { siteSignature } : {},
    );
    return { outcome: { status: "sent", message: done.message }, values: {}, path };
  } catch (error) {
    const failure = formErrorOf(error);
    switch (failure.kind) {
      case "validation": {
        const { fields, general } = problemsFrom(
          failure.issues,
          new Set(form.fields.map((field) => field.key)),
        );
        return {
          outcome: {
            status: "invalid",
            fields,
            general: general || Object.keys(fields).length === 0,
          },
          values,
          path,
        };
      }
      case "captcha":
        return failed("captcha");
      case "token":
        return failed("token");
      case "rate_limited":
        return failed("rate_limited", failure.retryAfterSec ?? undefined);
      case "not_found":
        return failed("not_found");
      default:
        return failed("unavailable");
    }
  }
}
