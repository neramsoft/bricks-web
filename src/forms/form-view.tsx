"use client";

import { useRef, useState, type FormEvent } from "react";
import type { FormField, PublicForm } from "@probiz/sdk";
import type { Messages } from "@/lib/messages";
import { describeFailure, describeProblem } from "./errors";
import type { FieldProblem, FormOutcome } from "./outcome";

// The fields of a CMS form as markup. The server draws the whole form (this component is rendered
// on the server too), so it is complete before any script runs and posts by itself to
// `/api/forms/{id}`, which sends the visitor to a thank-you page. When the script has loaded it
// posts with `fetch` instead and shows the answer in place.

export interface FormHidden {
  /** The page's own address, where "back" leads. */
  returnPath: string;
  /** The id of the element the visitor is sent back to. */
  anchor: string;
  /** The signed time the page was rendered (src/forms/site-visit.ts); empty without a secret. */
  visit: string;
  lang: string;
  honeypot: string;
}

type Form = Pick<PublicForm, "id" | "fields" | "consentText" | "submitLabel">;

const fieldId = (prefix: string, key: string) => `${prefix}-${key}`;

function Field({
  field,
  prefix,
  messages,
  problem,
  disabled,
}: {
  field: FormField;
  prefix: string;
  messages: Messages["form"];
  problem: FieldProblem | undefined;
  disabled: boolean;
}) {
  const id = fieldId(prefix, field.key);
  const errorId = `${id}-err`;
  const helpId = field.helpText ? `${id}-help` : undefined;
  const describedBy =
    [helpId, problem ? errorId : undefined].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    name: field.key,
    required: field.required,
    disabled,
    "aria-invalid": problem ? (true as const) : undefined,
    "aria-describedby": describedBy,
  };
  const label = (
    <>
      {field.label}
      {field.required ? <span className="sr-only"> ({messages.required})</span> : null}
    </>
  );
  const help = field.helpText ? (
    <p className="field-help" id={helpId}>
      {field.helpText}
    </p>
  ) : null;
  const error = problem ? (
    <p className="field-error" id={errorId}>
      {describeProblem(problem, messages)}
    </p>
  ) : null;

  switch (field.type) {
    case "consent":
      return (
        <div className="field">
          <label className="check" htmlFor={id}>
            <input type="checkbox" {...common} />
            <span>{label}</span>
          </label>
          {help}
          {error}
        </div>
      );
    case "checkboxes":
      return (
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>{label}</legend>
          {(field.options ?? []).map((option, index) => (
            <label key={option.value} className="check">
              <input
                type="checkbox"
                id={index === 0 ? id : undefined}
                name={field.key}
                value={option.value}
                disabled={disabled}
                aria-invalid={problem ? true : undefined}
              />
              <span>{option.label}</span>
            </label>
          ))}
          {help}
          {error}
        </fieldset>
      );
    case "select":
      return (
        <div className="field">
          <label htmlFor={id}>{label}</label>
          <select defaultValue="" {...common}>
            <option value="" disabled={field.required}>
              {field.placeholder ?? messages.choose}
            </option>
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {help}
          {error}
        </div>
      );
    case "textarea":
      return (
        <div className="field">
          <label htmlFor={id}>{label}</label>
          <textarea
            placeholder={field.placeholder ?? undefined}
            minLength={field.minLength ?? undefined}
            maxLength={field.maxLength ?? undefined}
            {...common}
          />
          {help}
          {error}
        </div>
      );
    default: {
      const type =
        field.type === "email"
          ? "email"
          : field.type === "phone"
            ? "tel"
            : field.type === "date"
              ? "date"
              : field.type === "datetime"
                ? "datetime-local"
                : field.type === "number"
                  ? "number"
                  : "text";
      return (
        <div className="field">
          <label htmlFor={id}>{label}</label>
          <input
            type={type}
            placeholder={field.placeholder ?? undefined}
            minLength={field.minLength ?? undefined}
            maxLength={field.maxLength ?? undefined}
            min={field.min ?? undefined}
            max={field.max ?? undefined}
            autoComplete={
              field.type === "email" ? "email" : field.type === "phone" ? "tel" : undefined
            }
            inputMode={field.type === "number" ? "numeric" : undefined}
            {...common}
          />
          {help}
          {error}
        </div>
      );
    }
  }
}

export function FormView({
  form,
  hidden,
  messages,
  preview,
  prefix,
}: {
  form: Form;
  hidden: FormHidden;
  messages: Messages["form"];
  preview: boolean;
  prefix: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<FormOutcome | null>(null);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || pending) return;
    const element = event.currentTarget;
    setPending(true);
    try {
      const response = await fetch(element.action, {
        method: "POST",
        body: new FormData(element),
        headers: { Accept: "application/json" },
      });
      const body = (await response.json()) as { outcome?: FormOutcome };
      const result: FormOutcome = body.outcome ?? { status: "failed", kind: "unavailable" };
      setOutcome(result);
      if (result.status === "sent") element.reset();
      else if (result.status === "invalid") {
        const key = Object.keys(result.fields)[0];
        if (key) document.getElementById(fieldId(prefix, key))?.focus();
      }
    } catch {
      setOutcome({ status: "failed", kind: "unavailable" });
    } finally {
      setPending(false);
    }
  }

  const problems = outcome?.status === "invalid" ? outcome.fields : {};
  const status =
    outcome?.status === "sent"
      ? { kind: "sent", text: outcome.message || messages.sent }
      : outcome?.status === "invalid"
        ? { kind: "error", text: messages.invalid }
        : outcome
          ? { kind: "error", text: describeFailure(outcome.kind, messages) }
          : null;

  return (
    <form
      ref={ref}
      method="post"
      action={`/api/forms/${form.id}`}
      onSubmit={send}
      noValidate={false}
      aria-busy={pending}
    >
      <input type="hidden" name="_return" value={hidden.returnPath} />
      <input type="hidden" name="_anchor" value={hidden.anchor} />
      <input type="hidden" name="_lang" value={hidden.lang} />
      {hidden.visit ? <input type="hidden" name="_visit" value={hidden.visit} /> : null}
      <div className="trap" aria-hidden="true">
        <label>
          Website
          <input type="text" name={hidden.honeypot} tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {form.fields.map((field) => (
        <Field
          key={field.key}
          field={field}
          prefix={prefix}
          messages={messages}
          problem={problems[field.key]}
          disabled={false}
        />
      ))}
      {form.consentText ? <p className="field-help">{form.consentText}</p> : null}
      <div role="status" aria-live="polite">
        {status ? (
          <p className="form-status" data-kind={status.kind}>
            {status.text}
          </p>
        ) : null}
        {preview ? <p className="form-status">{messages.previewNotSent}</p> : null}
      </div>
      <button className="btn" type="submit" disabled={pending || preview}>
        {pending ? messages.sending : (form.submitLabel ?? messages.send)}
      </button>
    </form>
  );
}
