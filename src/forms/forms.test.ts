import type { ApiIssue, PublicForm } from "@probiz/sdk";
import { describe, expect, it } from "vitest";
import { bs } from "@/lib/messages/bs";
import { describeFailure, describeProblem, problemsFrom } from "./errors";
import { outcomeFromWord, outcomeStatus, outcomeWord } from "./outcome";
import { cleanAnchor, cleanPagePath, isSameOrigin, visitorAddress } from "./request";
import { SIGNATURE_MAX_AGE_SECONDS, signedVisit, siteSignatureFor } from "./site-visit";
import { honeypotName } from "./submit-shared";

const issue = (path: string, code: string, more: Partial<ApiIssue> = {}): ApiIssue => ({
  path,
  code,
  message: code,
  ...more,
});

describe("problemsFrom", () => {
  it("keeps the first problem of each known field and marks unknown keys as general", () => {
    const keys = new Set(["ime", "osobe"]);
    expect(
      problemsFrom([issue("values.ime", "required"), issue("values.ime", "too_short")], keys),
    ).toEqual({
      fields: { ime: { code: "required" } },
      general: false,
    });
    expect(problemsFrom([issue("values.gone", "required")], keys)).toEqual({
      fields: {},
      general: true,
    });
    expect(
      problemsFrom([issue("values.osobe", "out_of_range", { maximum: 12 })], keys).fields.osobe,
    ).toEqual({
      code: "out_of_range",
      max: 12,
    });
  });
  it("is worded in the site's language, never with the API's message", () => {
    expect(describeProblem({ code: "required" }, bs.form)).toBe("Ovo polje je obavezno.");
    expect(describeProblem({ code: "something_new" }, bs.form)).toBe(bs.form.problems.other);
    expect(describeFailure("rate_limited", bs.form)).toContain("Previše");
  });
});

describe("outcomes", () => {
  it("round-trip through the thank-you page's address and map to statuses", () => {
    expect(outcomeWord({ status: "sent", message: "x" })).toBe("sent");
    expect(outcomeWord({ status: "failed", kind: "captcha" })).toBe("captcha");
    expect(outcomeFromWord("rate_limited")).toBe("rate_limited");
    expect(outcomeFromWord("<script>")).toBeNull();
    expect(outcomeFromWord(undefined)).toBeNull();
    expect(outcomeStatus({ status: "sent", message: "" })).toBe(200);
    expect(outcomeStatus({ status: "invalid", fields: {}, general: true })).toBe(422);
    expect(outcomeStatus({ status: "failed", kind: "rate_limited" })).toBe(429);
  });
});

describe("what a post is trusted with", () => {
  it("takes only a plain path as the page the form was on", () => {
    expect(cleanPagePath("/en/rezervacija")).toBe("/en/rezervacija");
    for (const bad of ["//evil.com", "https://evil.com", "/a/../b", "/a b", "/a?x=1", "", 5]) {
      expect(cleanPagePath(bad), String(bad)).toBeNull();
    }
    expect(cleanAnchor("rezervacija")).toBe("rezervacija");
    expect(cleanAnchor("x y")).toBeNull();
  });
  it("refuses a post from another site", () => {
    const headers = (entries: Record<string, string>) => ({
      get: (name: string) => entries[name.toLowerCase()] ?? null,
    });
    expect(isSameOrigin(headers({ origin: "https://bricks.ba" }), "https://bricks.ba")).toBe(true);
    expect(
      isSameOrigin(
        headers({ origin: "https://evil.example", host: "bricks.ba" }),
        "https://bricks.ba",
      ),
    ).toBe(false);
    expect(isSameOrigin(headers({ "sec-fetch-site": "cross-site" }), "https://bricks.ba")).toBe(
      false,
    );
  });
  it("reads the visitor's address from the trusted proxy's entry only", () => {
    const h = { get: () => "6.6.6.6, 203.0.113.7" };
    expect(visitorAddress(h, 1)).toBe("203.0.113.7");
    expect(visitorAddress(h, 0)).toBeNull();
  });
  it("picks a honeypot name the form does not use", () => {
    const form = (keys: string[]) =>
      ({ fields: keys.map((key) => ({ key })) }) as unknown as Pick<PublicForm, "fields">;
    expect(honeypotName(form(["ime"]))).toBe("website");
    expect(honeypotName(form(["website"]))).toBe("homepage");
  });
});

describe("the signed visit", () => {
  const secret = "whsec_test";
  const form = "00000000-0000-4000-8000-000000000900";
  it("is signed for one form and checked with the same secret", async () => {
    const now = Date.parse("2026-11-20T12:00:00Z");
    const field = await signedVisit(secret, form, now);
    expect(field).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    expect(await siteSignatureFor({ secret, formId: form, field, nowMs: now + 5_000 })).toBe(field);
    expect(await siteSignatureFor({ secret, formId: "other", field, nowMs: now })).toBeNull();
    expect(
      await siteSignatureFor({ secret: "whsec_other", formId: form, field, nowMs: now }),
    ).toBeNull();
    expect(
      await siteSignatureFor({ secret, formId: form, field: "t=1,v1=zz", nowMs: now }),
    ).toBeNull();
  });
  it("has none without a secret, and is renewed when it is older than the API takes", async () => {
    expect(await signedVisit(undefined, form)).toBeNull();
    const then = Date.parse("2026-11-10T12:00:00Z");
    const field = await signedVisit(secret, form, then);
    const now = then + (SIGNATURE_MAX_AGE_SECONDS + 3600) * 1000;
    const renewed = await siteSignatureFor({ secret, formId: form, field, nowMs: now });
    expect(renewed).not.toBe(field);
    expect(renewed).toMatch(/^t=\d+,v1=/);
  });
});
