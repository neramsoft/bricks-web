import type { PublicForm } from "@probiz/sdk";

// What the page and the handler agree on without either importing the other.

const HONEYPOT_NAMES = ["website", "homepage", "url", "site"];

/** The honeypot's input name: the API's `website`, unless the form has a field of that key. */
export function honeypotName(form: Pick<PublicForm, "fields">): string {
  const taken = new Set(form.fields.map((field) => field.key));
  return HONEYPOT_NAMES.find((name) => !taken.has(name)) ?? "website_2";
}
