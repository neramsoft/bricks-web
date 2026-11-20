import { getSiteData } from "@/lib/data";
import { messagesFor } from "@/lib/messages";

// A bad, expired or missing preview token: 404, nothing about the draft is shown.
export default async function PreviewNotFound() {
  const site = await getSiteData();
  const messages = messagesFor(site.defaultLocale);
  return (
    <main className="p-4">
      <title>{messages.previewInvalid.title}</title>
      <meta name="robots" content="noindex, nofollow" />
      <h1>{messages.previewInvalid.title}</h1>
      <p>{messages.previewInvalid.lead}</p>
    </main>
  );
}
