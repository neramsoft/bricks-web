import { messagesFor } from "@/lib/messages";

// A direct visit to /missing (the proxy does not see that prefix): Next's own 404, kept tiny. The
// 404 that visitors get is the page itself (./page.tsx), drawn with the proxy's status.
export default function NotFound() {
  const messages = messagesFor("bs");
  return (
    <>
      <title>{messages.notFound.title}</title>
      <h1>{messages.notFound.heading}</h1>
      <p>{messages.notFound.lead}</p>
    </>
  );
}
