import type { Messages } from "./messages";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The body of a 410 answer. A status of 410 can only be sent by the proxy, which cannot render a
 * React page, so this is one small self-contained document in the visitor's system colours,
 * with a way home. It is not indexed.
 */
export function goneHtml(options: {
  locale: string;
  messages: Messages["gone"];
  homeLabel: string;
  homeHref: string;
}): string {
  const { locale, messages, homeLabel, homeHref } = options;
  return `<!doctype html>
<html lang="${escapeHtml(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, follow">
<title>${escapeHtml(messages.title)}</title>
<style>
:root{color-scheme:light dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;font:18px/28px system-ui,sans-serif;background:Canvas;color:CanvasText}
main{max-width:640px}
h1{font-size:36px;line-height:40px;margin:0 0 16px;letter-spacing:-0.02em}
a{color:LinkText}
</style>
</head>
<body>
<main>
<h1>${escapeHtml(messages.heading)}</h1>
<p>${escapeHtml(messages.lead)}</p>
<p><a href="${escapeHtml(homeHref)}">${escapeHtml(homeLabel)}</a></p>
</main>
</body>
</html>
`;
}
