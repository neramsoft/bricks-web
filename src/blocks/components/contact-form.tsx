import { honeypotName } from "@/forms/submit-shared";
import { FormView } from "@/forms/form-view";
import { signedVisit } from "@/forms/site-visit";
import { getFormData } from "@/lib/data";
import { env } from "@/lib/env";
import { RichTextView } from "./rich-text";
import { Section } from "./section";
import type { BlockProps } from "./props";

/**
 * The reservation form, drawn as the prototype's brick coupon: the heading and a line on the
 * left, the CMS form on the right. A form that is missing or disabled draws nothing the visitor
 * would take for a working form: the block says it is not available. The form posts by itself
 * without script (src/app/api/forms).
 */
export async function ContactForm({ block, ctx }: BlockProps<"contactForm">) {
  const d = block.data;
  const form = d.formId ? await getFormData(d.formId).catch(() => null) : null;
  const heading = d.heading;
  if (!form) {
    return (
      <Section id={block.id} anchorId={block.anchorId} heading={heading}>
        <p className="block-empty">{ctx.messages.form.unavailable}</p>
      </Section>
    );
  }
  const visit = await signedVisit(env().REVALIDATE_SECRET, form.id);
  const anchor = block.anchorId ?? `form-${block.id}`;
  return (
    <section
      id={anchor}
      aria-labelledby={heading ? `${block.id}-h` : undefined}
      className="block wrap"
      data-block-id={block.id}
    >
      <div className="coupon" data-reveal>
        <div className="perf" aria-hidden="true" />
        <div className="coupon-left">
          <div>{heading ? <h2 id={`${block.id}-h`}>{heading}</h2> : null}</div>
          <div>
            {d.text ? <p>{d.text}</p> : null}
            {d.aside ? <RichTextView content={d.aside} className="prose aside" /> : null}
          </div>
        </div>
        <FormView
          form={form}
          hidden={{
            returnPath: ctx.path,
            anchor,
            visit: visit ?? "",
            lang: ctx.locale,
            honeypot: honeypotName(form),
          }}
          messages={ctx.messages.form}
          preview={ctx.preview}
          prefix={`f-${block.id.slice(0, 8)}`}
        />
      </div>
    </section>
  );
}
