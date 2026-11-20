import { describe, expect, it } from "vitest";
import { messagesFor } from "./messages";
import { goneHtml } from "./gone-page";

describe("goneHtml", () => {
  it("is a noindex document in the language with a way home", () => {
    const html = goneHtml({
      locale: "en",
      messages: messagesFor("en").gone,
      homeLabel: "Back <home>",
      homeHref: "/en",
    });
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<meta name="robots" content="noindex, follow">');
    expect(html).toContain('<a href="/en">Back &lt;home&gt;</a>');
    expect(html).toContain("<h1>This page has been removed for good</h1>");
  });
});
