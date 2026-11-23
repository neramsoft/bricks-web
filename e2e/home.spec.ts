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
    await expect(page.locator("#dogadjaji .ev-featured")).toHaveCount(1);
    await expect(page.locator("#dogadjaji .ev")).toHaveCount(3);
    await expect(page.locator(".venue h3")).toHaveText("Bricks Tuzla");
    await expect(page.locator("#rezervacija form")).toBeVisible();
    await expect(page.getByRole("link", { name: "Navigacija" }).first()).toHaveAttribute(
      "href",
      /google\.com\/maps\/dir\/\?api=1&destination=44\.5384,18\.6671/,
    );

    // The next event is the wide card, with its photograph, the facts and the two buttons.
    const next = page.locator("#dogadjaji .ev-featured");
    await expect(next.locator(".ev-kind")).toHaveText("Sljedeće · Live muzika");
    await expect(next.getByRole("heading", { level: 3 })).toHaveText("Akustika petkom");
    await expect(next.locator(".ev-photo img")).toHaveAttribute("alt", "Gitarista na pozornici");
    const facts = next.locator(".ev-facts > div");
    await expect(facts.locator("dt")).toHaveText(["Kad", "Gdje", "Ulaz", "Svira"]);
    await expect(facts.nth(0).locator("dd")).toHaveText(/^\S+, \d+\. \S+ · 21:00–23:00$/);
    await expect(facts.nth(1).locator("dd")).toHaveText("Bricks Tuzla");
    await expect(facts.nth(2).locator("dd")).toHaveText("Bez ulaza");
    await expect(facts.nth(3).locator("dd")).toHaveText("Duo Slatina, Amar Hodžić");
    await expect(next.getByRole("link", { name: "Rezerviši sto" })).toHaveAttribute(
      "href",
      "#rezervacija",
    );
    const calendar = next.getByRole("link", { name: "Dodaj u kalendar" });
    await expect(calendar).toHaveAttribute(
      "href",
      /^http:\/\/127\.0\.0\.1:4010\/v1\/public\/events\/[0-9a-f-]+\/ics$/,
    );
    const ics = await page.request.get((await calendar.getAttribute("href"))!);
    expect(ics.headers()["content-type"]).toContain("text/calendar");
    // The others are rows, under their own heading: paid, free past midnight, cancelled.
    await expect(page.locator("#dogadjaji .ev-more-h")).toHaveText("Poslije toga");
    const rows = page.locator("#dogadjaji .ev");
    await expect(rows.nth(0).locator(".meta")).toHaveText(
      /^\S+, 20:00 · Kviz · Bricks Tuzla · 5,00\sKM$/,
    );
    await expect(rows.nth(1).locator(".meta")).toHaveText(
      /^\S+, 21:00–\S+ 01:00 · DJ · Bricks Tuzla · Bez ulaza$/,
    );
    await expect(rows.nth(2).locator(".badge")).toHaveText("Otkazano");
    await expect(rows.nth(2).locator(".meta")).toContainText(/od 10,00\sKM/);

    // Prices in several sizes, the recommendation, the struck-through dish.
    const heineken = page.locator(".menu-item", { hasText: "Heineken točeno" });
    await expect(heineken).toContainText("3,00 KM");
    await expect(heineken).toContainText("6,00 KM");
    await expect(heineken.locator(".plabel")).toHaveText(["0,25", "0,5"]);
    await expect(page.locator(".menu-item[data-unavailable] s")).toHaveText(
      "Prirodna jabuka 0,3 l",
    );

    // Labels as chips: the ABV and the zero chips, the muted line under the lead.
    await expect(heineken.locator(".d")).toHaveText("S točionika, 0,5 l.");
    await expect(heineken.locator(".tags i[data-chip]")).toHaveText(["5 % alk.", "točeno"]);
    await expect(heineken.locator(".tags i.abv")).toHaveText("5 % alk.");
    const zero = page.locator(".menu-item", { hasText: "Heineken 0%" });
    await expect(zero.locator(".tags i.zero")).toHaveText("0 % alkohola");
    await expect(
      page.locator("#coffee .menu-item", { hasText: "limunada" }).locator("i[data-chip]"),
    ).toHaveText(["Svježe cijeđeno", "domaći"]);
    await expect(page.locator(".menu-item i.abv")).toHaveCount(1);
    await expect(page.locator(".menu-item i.zero")).toHaveCount(1);
    await expect(page.locator("#coffee .chapter-lead > p").first()).toHaveText(
      /^Kafa je Julius Meinl/,
    );
    await expect(page.locator("#coffee .lead-note")).toHaveText(
      "Kafu točimo od otvaranja do zatvaranja, ne samo ujutro.",
    );
    for (const id of ["coffee", "beer"]) {
      await page
        .locator(`#${id}`)
        .screenshot({ path: `test-results/screenshots/menu-${id}-bs-1440.png` });
    }

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
    const events = nodes.filter((node) => typesOf(node).includes("Event"));
    expect(events).toHaveLength(4);
    // What the wide card shows is in its node: the end, the performers, the free offer.
    expect(events[0]).toMatchObject({
      name: "Akustika petkom",
      performer: [{ name: "Duo Slatina" }, { name: "Amar Hodžić" }],
      offers: { price: 0, priceCurrency: "BAM" },
    });
    expect(events[0]).toHaveProperty("endDate");
    // A row shows no performers and, with no end, no endDate.
    expect(events[1]).not.toHaveProperty("performer");
    expect(events[1]).not.toHaveProperty("endDate");
    expect(events[1]).toMatchObject({ offers: { price: 5 } });
    expect(events[3]).toMatchObject({ eventStatus: "https://schema.org/EventCancelled" });
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
    await page
      .locator("#dogadjaji")
      .screenshot({ path: "test-results/screenshots/events-bs-1440.png" });
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
    // The wide card's date tile sits above the text and is 72 px wide.
    const tile = page.locator("#dogadjaji .ev-featured .tile-date");
    const text = page.locator("#dogadjaji .ev-featured .ev-ftext");
    expect((await tile.boundingBox())!.width).toBe(72);
    expect((await tile.boundingBox())!.y).toBeLessThan((await text.boundingBox())!.y);
    await page
      .locator("#dogadjaji")
      .screenshot({ path: "test-results/screenshots/events-bs-390.png" });
    for (const id of ["coffee", "beer"]) {
      await page
        .locator(`#${id}`)
        .screenshot({ path: `test-results/screenshots/menu-${id}-bs-390.png` });
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
    const next = page.locator("#dogadjaji .ev-featured");
    await expect(next.locator(".ev-kind")).toHaveText("Next · Live muzika");
    await expect(next.locator(".ev-facts dt")).toHaveText(["When", "Where", "Entry", "Playing"]);
    await expect(next.locator(".ev-facts dd").nth(2)).toHaveText("Free entry");
    await expect(next.getByRole("link", { name: "Add to calendar" })).toBeVisible();
    await expect(page.locator("#dogadjaji .ev-more-h")).toHaveText("Coming up after");
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
