import { expect, test, type Page } from "@playwright/test";

// What PageSpeed's Agentic Browsing and accessibility audits look at: /llms.txt, the well-known
// address of an agent manifest the site does not have, and the order of the headings.

test.describe("llms.txt", () => {
  test("is plain Markdown: an H1, a summary, links in both languages, absolute addresses", async ({
    request,
  }) => {
    const response = await request.get("/llms.txt");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/plain");
    const text = await response.text();
    expect(text).toMatch(/^# Bricks\n/);
    expect(text).not.toContain("<html");
    expect(text).toMatch(/^> .+/m);
    expect(text).toContain("## Bosanski");
    expect(text).toContain("## English");
    // The home page carries the reservation form; forms are core, not in the module list.
    expect(text).toContain("rezervisati sto");
    const links = [...text.matchAll(/\[[^\]]+\]\((http[^)]+)\)/g)].map((m) => m[1]!);
    expect(links.length).toBeGreaterThan(0);
    expect(links).toContain("http://127.0.0.1:4011/sitemap.xml");
    expect(links.some((link) => link.startsWith("http://127.0.0.1:4011/en"))).toBe(true);
    expect(links.some((link) => link.includes("/#rezervacija"))).toBe(true);
    // Every link points at the site itself.
    for (const link of links) expect(link.startsWith("http://127.0.0.1:4011/")).toBe(true);
  });
});

test.describe("addresses the site never serves", () => {
  for (const path of [
    "/.well-known/ard.json",
    "/.well-known/llms.txt",
    "/wp-login.php",
    "/x.json",
  ]) {
    test(`${path} is a fast plain 404`, async ({ request }) => {
      // The first request may wake the server up: measure the second.
      await request.get(path);
      const started = Date.now();
      const response = await request.get(path);
      const took = Date.now() - started;
      expect(response.status()).toBe(404);
      expect(response.headers()["content-type"]).toContain("text/plain");
      expect(await response.text()).not.toContain("<");
      expect(took).toBeLessThan(500);
    });
  }

  test("are not reported to the CMS's 404 log", async ({ request }) => {
    await request.get("http://127.0.0.1:4010/__reset");
    await request.get("/.well-known/ard.json");
    await request.get("/wp-login.php");
    const posts = (await (await request.get("http://127.0.0.1:4010/__posts")).json()) as Array<{
      path: string;
    }>;
    expect(posts.filter((post) => post.path.startsWith("/v1/public/not-found"))).toEqual([]);
  });

  test("robots.txt and sitemap.xml are still served", async ({ request }) => {
    expect((await request.get("/robots.txt")).status()).toBe(200);
    expect((await request.get("/sitemap.xml")).status()).toBe(200);
  });
});

/** The levels of the headings of the page, in document order. */
async function headingLevels(page: Page): Promise<number[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => Number(h.tagName[1])),
  );
}

/** Lighthouse's `heading-order`: the first is an h1 and no heading is more than one level below the one before it. */
function jumps(levels: number[]): string[] {
  const problems: string[] = [];
  levels.forEach((level, index) => {
    const before = levels[index - 1];
    if (before !== undefined && level - before > 1) problems.push(`h${before} then h${level}`);
  });
  return problems;
}

test.describe("heading order", () => {
  for (const path of ["/", "/en", "/tuzla", "/privatnost"]) {
    test(`${path} never skips a level`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      const levels = await headingLevels(page);
      expect(levels[0]).toBe(1);
      expect(levels.filter((level) => level === 1)).toHaveLength(1);
      expect(jumps(levels)).toEqual([]);
    });
  }
});
