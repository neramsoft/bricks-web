import { messagesFor } from "@/lib/messages";

// The safety net of the cached page route: a page that was there when the proxy looked and gone
// when it rendered. The proxy sends every other missing address to /missing, which answers 404
// per request, with the site's chrome, in the visitor's language, and reports it.
// Next serialises this component into every page of the route, so it stays tiny and reads
// nothing: no request, no CMS data.
export default function NotFound() {
  const messages = messagesFor("bs");
  return (
    <>
      <title>{messages.notFound.title}</title>
      <h1>{messages.notFound.heading}</h1>
      <p>{messages.notFound.lead}</p>
      <p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- A plain link: the page that rendered this is gone, so a soft navigation would reuse it. */}
        <a href="/">{messages.notFound.home}</a>
      </p>
    </>
  );
}
