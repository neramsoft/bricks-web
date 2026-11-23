import { expect, test, type ConsoleMessage } from "@playwright/test";
import { loadEverything, screenshots, viewportShots } from "./support/shots.ts";

// Every CMS picture comes from the CMS's ready variants, never from Next's optimizer.
const VARIANT = /\/media\/[^/]+\/w\d+\.webp(\?|$)/;

for (const width of [1440, 390]) {
  test(`${width} px: pictures use CMS variants, load, and never go through /_next/image`, async ({
    page,
  }, testInfo) => {
    const requests: string[] = [];
    const problems: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    page.on("console", (message: ConsoleMessage) => {
      if (["warning", "error"].includes(message.type())) problems.push(message.text());
    });
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.goto("/");
    await loadEverything(page);

    const pictures = await page.locator("main img").evaluateAll((imgs) =>
      (imgs as HTMLImageElement[]).map((img) => ({
        src: img.getAttribute("src") ?? "",
        srcset: img.getAttribute("srcset") ?? "",
        sizes: img.getAttribute("sizes") ?? "",
        width: img.getAttribute("width"),
        height: img.getAttribute("height"),
        loaded: img.complete && img.naturalWidth > 0,
        current: img.currentSrc,
      })),
    );
    expect(pictures.length).toBeGreaterThan(5);
    for (const picture of pictures) {
      expect(picture.src).toMatch(VARIANT);
      expect(picture.srcset).not.toBe("");
      for (const entry of picture.srcset.split(",")) {
        expect(entry.trim().split(/\s+/)[0]).toMatch(VARIANT);
      }
      expect(picture.sizes).not.toBe("");
      expect(picture.width).toBeTruthy();
      expect(picture.height).toBeTruthy();
      expect(picture.loaded).toBe(true);
      expect(picture.current).toMatch(VARIANT);
    }
    // A srcset names a file once, labelled with its real width.
    for (const picture of pictures) {
      const urls = picture.srcset.split(",").map((entry) => entry.trim().split(/\s+/)[0]);
      expect(new Set(urls).size).toBe(urls.length);
    }
    // A phone is not sent the 1920 px file for a half-width picture.
    if (width === 390) {
      for (const picture of pictures) expect(picture.current).not.toMatch(/\/w(1920|2560)\./);
    }

    expect(requests.filter((url) => url.includes("/_next/image"))).toEqual([]);
    expect(problems).toEqual([]);
    await screenshots(page, testInfo, "images-home");
  });
}

test("the gallery pictures carry a blur placeholder and a dominant colour until they load", async ({
  page,
}) => {
  await page.goto("/");
  const first = page.locator("#galerija .ph img").first();
  const style = await first.getAttribute("style");
  expect(style).toContain("background-image");
  expect(style).toContain("data:image/svg+xml");
  await expect(first).toHaveAttribute("width", /\d+/);
});

test("the lightbox loads the CMS variant, preloads both neighbours and drops its loading indicator", async ({
  page,
}, testInfo) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  const grid = page.locator("#galerija .gal-grid");
  await grid.locator(".ph-open").nth(2).scrollIntoViewIfNeeded();
  await loadEverything(page);
  await screenshots(page, testInfo, "images-gallery", { scroll: false });
  await page.locator("#galerija .ph-open").nth(2).scrollIntoViewIfNeeded();

  const names = await grid
    .locator("img")
    .evaluateAll((imgs) =>
      (imgs as HTMLImageElement[]).map((img) => /\/media\/([^/]+)\//.exec(img.src)?.[1] ?? ""),
    );
  const before = requests.length;
  await grid.locator(".ph-open").nth(2).click();
  const dialog = page.getByRole("dialog");
  const picture = dialog.getByRole("img");
  await expect(picture).toBeVisible();
  await expect(dialog.locator(".lb-counter")).toHaveText("3 / 7");
  await expect(picture).toHaveAttribute("src", VARIANT);
  await expect(picture).toHaveAttribute("srcset", /w1920\.webp .*w2560\.webp|w640\.webp/);
  expect(await picture.getAttribute("src")).not.toContain("/_next/image");
  await expect
    .poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  await expect(dialog.locator(".lb-spinner")).toHaveCount(0);

  // Both neighbours (2 and 4) were fetched ahead, from a variant address.
  const after = requests.slice(before);
  for (const at of [1, 3]) {
    const name = names[at];
    expect(name).toBeTruthy();
    await expect
      .poll(() => requests.some((url) => url.includes(`/media/${name}/`) && VARIANT.test(url)))
      .toBe(true);
  }
  expect(after.filter((url) => url.includes("/_next/image"))).toEqual([]);

  // Stepping to a neighbour shows a picture the browser already has: no new request for it.
  const nextName = names[3]!;
  const loadedBefore = requests.filter((url) => url.includes(`/media/${nextName}/`)).length;
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator(".lb-counter")).toHaveText("4 / 7");
  await expect(picture).toHaveAttribute("src", new RegExp(`/media/${nextName}/`));
  await expect(dialog.locator(".lb-spinner")).toHaveCount(0);
  expect(requests.filter((url) => url.includes(`/media/${nextName}/`)).length).toBe(loadedBefore);

  await viewportShots(page, testInfo, "images-lightbox");
});

test("the lightbox shows a loading indicator until a slow picture has arrived", async ({
  page,
}) => {
  await page.route(/\/media\/[^/]+\/w\d+\.webp/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.goto("/");
  const open = page.locator("#galerija .ph-open").first();
  await open.scrollIntoViewIfNeeded();
  await open.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("status", { name: "Učitavanje fotografije" })).toBeVisible();
  await expect(dialog.locator(".lb-spinner")).toHaveCount(0, { timeout: 10_000 });
});

test("a click beside a picture that is still loading closes the lightbox", async ({ page }) => {
  // The file arrives late, so the click lands before the image has a natural size.
  await page.route(/\/media\/[^/]+\/w\d+\.webp/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.continue();
  });
  await page.goto("/");
  const open = page.locator("#galerija .ph-open").first();
  await open.scrollIntoViewIfNeeded();
  await open.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("status", { name: "Učitavanje fotografije" })).toBeVisible();
  await dialog.click({ position: { x: 150, y: 300 } });
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
});
