import { expect, test } from "@playwright/test";
import { jsonLd, screenshots, typesOf } from "./support/shots.ts";

test.describe("home page", () => {
  test("bs: the prototype's sections, the now line, the header buttons and the JSON-LD", async ({
    page,
  }, testInfo) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "bs");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Coffee, Beer & People.");

    // The header: five links and two buttons, the second one in the brick colour.
    const header = page.locator("header.site-header");
    await expect(header.getByRole("link", { name: "Rezerviši sto" })).toHaveClass(/btn/);
    await expect(header.getByRole("link", { name: "Meni" })).toHaveClass(/quiet/);
    await expect(header.getByRole("link", { name: "English" })).toHaveAttribute("href", "/en");

    // The line under the headline is on the page (the first HTML draws it) and says the state.
    await expect(page.locator(".now")).toContainText(/Otvoreno|Zatvoreno|Otvaramo/);

    // The chapters, the events with the featured one wide, the venue, the form.
    await expect(page.locator("#coffee h2")).toHaveText("Coffee");
    await expect(page.locator("#beer h2")).toHaveText("Beer");
    await expect(page.locator("#dogadjaji .ev")).toHaveCount(4);
    await expect(page.locator("#dogadjaji .ev.featured")).toHaveCount(1);
    await expect(page.locator(".venue h3")).toHaveText("Bricks Tuzla");
    await expect(page.locator("#rezervacija form")).toBeVisible();
    await expect(page.getByRole("link", { name: "Navigacija" }).first()).toHaveAttribute(
      "href",
      /google\.com\/maps\/dir\/\?api=1&destination=44\.5384,18\.6671/,
    );

    // Prices in several sizes, the recommendation, the struck-through dish.
    const heineken = page.locator(".menu-item", { hasText: "Heineken točeno" });
    await expect(heineken).toContainText("3,00 KM");
    await expect(heineken).toContainText("6,00 KM");
    await expect(heineken.locator(".plabel")).toHaveText(["0,25", "0,5"]);
    await expect(page.locator(".menu-item[data-unavailable] s")).toHaveText(
      "Prirodna jabuka 0,3 l",
    );

    // No script is needed for any of it: the raw HTML has the headline, the menu and the events.
    const raw = await (await page.request.get("/")).text();
    expect(raw).toContain("Coffee, Beer &amp; People.");
    expect(raw).toContain("Espresso Julius Meinl");
    expect(raw).toContain("Pub kviz");

    // JSON-LD matches what the page shows.
    const nodes = await jsonLd(page);
    const business = nodes.find((node) => typesOf(node).includes("BarOrPub"));
    expect(business && typesOf(business)).toEqual(["BarOrPub", "CafeOrCoffeeShop"]);
    expect(business).toMatchObject({
      geo: { latitude: 44.5384, longitude: 18.6671 },
      address: { streetAddress: "Slatina do br. 14" },
    });
    expect(business?.openingHoursSpecification).toBeTruthy();
    expect(business?.hasMenu).toBeTruthy();
    expect(nodes.filter((node) => typesOf(node).includes("Event"))).toHaveLength(4);
    // The venue's own node: only what its card shows.
    const venue = nodes.find(
      (node) => node.name === "Bricks Tuzla" && typesOf(node).includes("BarOrPub"),
    );
    expect(venue).toMatchObject({ telephone: "+387 33 000 000" });
    expect(venue).not.toHaveProperty("geo");
    // No breadcrumbs on the home page.
    expect(nodes.some((node) => typesOf(node).includes("BreadcrumbList"))).toBe(false);
    await expect(page.locator(".crumbs")).toHaveCount(0);

    await screenshots(page, testInfo, "home-bs");
  });

  test("bs at 390 px: the phone bar and the burger", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const bar = page.getByRole("navigation", { name: "Brze radnje" });
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("link")).toHaveText(["Meni", "Rezerviši sto", "Pozovi"]);
    await expect(bar.getByRole("link", { name: "Pozovi" })).toHaveAttribute(
      "href",
      "tel:+38733000000",
    );
    for (const link of await bar.getByRole("link").all()) {
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(56);
    }
    // Nothing is wider than the screen.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    // The burger opens the links without script.
    await expect(page.getByRole("link", { name: "Galerija" }).first()).toBeHidden();
    await page.locator("label.nav-burger").click();
    await expect(page.getByRole("link", { name: "Galerija" }).first()).toBeVisible();
  });

  test("en: the translated page, hreflang and the switcher", async ({ page }, testInfo) => {
    const response = await page.goto("/en");
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#dogadjaji h2")).toHaveText("Live");
    await expect(
      page.locator("header.site-header").getByRole("link", { name: "Book a table" }),
    ).toBeVisible();
    await expect(
      page.locator("header.site-header").getByRole("link", { name: "Bosanski" }),
    ).toHaveAttribute("href", "/");
    // English money: the narrow symbol first.
    await expect(page.locator(".menu-item", { hasText: "Espresso Julius Meinl" })).toContainText(
      "KM 2.50",
    );
    const alternates = await page
      .locator('link[rel="alternate"]')
      .evaluateAll((links) =>
        links.map((link) => [link.getAttribute("hreflang"), link.getAttribute("href")]),
      );
    expect(alternates).toEqual(
      expect.arrayContaining([
        ["bs", "http://127.0.0.1:4011/"],
        ["en", "http://127.0.0.1:4011/en"],
      ]),
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "http://127.0.0.1:4011/en",
    );
    await screenshots(page, testInfo, "home-en");
  });
});
