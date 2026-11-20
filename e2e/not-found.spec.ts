import { expect, test } from "@playwright/test";
import { screenshots } from "./support/shots.ts";

test.describe("404", () => {
  test("the text is in the first HTML, with status 404 and noindex", async ({ request }) => {
    const response = await request.get("/ovo-ne-postoji");
    expect(response.status()).toBe(404);
    const html = await response.text();
    // A server-rendered page: the words are in the markup, not only in a script's data.
    expect(html).toContain("<h1");
    expect(html).toMatch(/<h1[^>]*>Ova stranica ne postoji<\/h1>/);
    expect(html).toContain("Nazad na početnu");
    expect(html).not.toContain('id="__next_error__"');
    expect(html).toMatch(/<meta name="robots" content="noindex, follow"\/?>/);
    expect(html).toContain("<title>Stranica nije pronađena | Bricks</title>");
    // It has the site's chrome too.
    expect(html).toContain("Rezerviši sto");
    expect(html).toContain('<html lang="bs"');
  });

  test("in English under /en, and for the default language's own prefix", async ({ request }) => {
    const en = await request.get("/en/does-not-exist");
    expect(en.status()).toBe(404);
    expect(await en.text()).toMatch(/<h1[^>]*>This page does not exist<\/h1>/);
    const prefixed = await request.get("/bs/privatnost");
    expect(prefixed.status()).toBe(404);
  });

  test("a direct visit to the internal address is a plain 404", async ({ request }) => {
    expect((await request.get("/missing/ovo-ne-postoji")).status()).toBe(404);
  });

  test("the visit is reported to the CMS", async ({ request }) => {
    await request.get("http://127.0.0.1:4010/__reset");
    await request.get("/prijavi-me");
    await expect
      .poll(async () => {
        const posts = (await (await request.get("http://127.0.0.1:4010/__posts")).json()) as Array<{
          path: string;
          body: { path?: string };
        }>;
        return posts.find((post) => post.path.startsWith("/v1/public/not-found"))?.body.path;
      })
      .toBe("/prijavi-me");
  });

  test("the page looks right", async ({ page }, testInfo) => {
    await page.goto("/ovo-ne-postoji");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ova stranica ne postoji");
    await screenshots(page, testInfo, "not-found");
  });
});
