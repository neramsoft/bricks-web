import type { Page, TestInfo } from "@playwright/test";

export const SIZES = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
] as const;

/** Scrolls the page top to bottom so lazy pictures load, then back to the top. */
export async function loadEverything(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const step = Math.max(400, window.innerHeight - 100);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    await Promise.all(
      [...document.images].map((img) =>
        img.complete ? null : new Promise((resolve) => (img.onload = img.onerror = resolve)),
      ),
    );
    window.scrollTo(0, 0);
  });
}

/**
 * A full-page screenshot at 1440 x 900 and at 390 x 844, saved under test-results/screenshots and
 * attached to the test. Leaves the viewport as it found it.
 */
export async function screenshots(
  page: Page,
  testInfo: TestInfo,
  name: string,
  options: { scroll?: boolean } = {},
): Promise<void> {
  const before = page.viewportSize();
  for (const size of SIZES) {
    await page.setViewportSize({ width: size.width, height: size.height });
    if (options.scroll !== false) await loadEverything(page);
    const path = `test-results/screenshots/${name}-${size.name}.png`;
    await page.screenshot({ path, fullPage: true });
    await testInfo.attach(`${name}-${size.name}`, { path, contentType: "image/png" });
  }
  if (before) await page.setViewportSize(before);
}

/** The JSON-LD nodes of a page, flattened out of their `@graph`. */
export async function jsonLd(page: Page): Promise<Array<Record<string, unknown>>> {
  const texts = await page.locator('script[type="application/ld+json"]').allTextContents();
  return texts.flatMap((text) => {
    const doc = JSON.parse(text) as { "@graph"?: Array<Record<string, unknown>> };
    return doc["@graph"] ?? [];
  });
}

export const typesOf = (node: Record<string, unknown>): string[] =>
  ([] as unknown[]).concat(node["@type"]).map(String);
