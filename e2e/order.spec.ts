import { expect, test, type Page } from "@playwright/test";
import { ITEMS, TOKENS } from "./support/ordering-fixture.ts";
import { screenshots, viewportShots } from "./support/shots.ts";

const API = "http://127.0.0.1:4010";
const table = (token: string = TOKENS.open) => `/s/${token}`;

test.beforeEach(async ({ request }) => {
  await request.get(`${API}/__reset`);
});

async function placeOrderOf(page: Page, note = "") {
  await page.getByRole("button", { name: "Dodaj Espresso", exact: true }).click();
  await page.getByRole("button", { name: "Više: Espresso" }).click();
  await page.getByRole("button", { name: "Dodaj Bricks burger" }).click();
  await page.getByRole("button", { name: "Pregledaj narudžbu" }).click();
  if (note) await page.getByLabel("Napomena za konobara").fill(note);
  await page.getByRole("button", { name: "Naruči za sto 7" }).click();
}

const ordersPosted = async (request: import("@playwright/test").APIRequestContext) =>
  (
    (await (await request.get(`${API}/__posts`)).json()) as Array<{
      path: string;
      headers: Record<string, string>;
      body: Record<string, unknown>;
    }>
  ).filter((post) => post.path.endsWith("/orders"));

test.describe("table page, first HTML", () => {
  test("the menu is server-rendered, never cached, not indexed", async ({ request }) => {
    const response = await request.get(table());
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["x-robots-tag"]).toBe("noindex, follow");
    const html = await response.text();
    expect(html).toMatch(/<meta name="robots" content="noindex, follow"\/?>/);
    expect(html).toContain('<html lang="bs"');
    expect(html).toContain("Espresso");
    expect(html).toContain("Točeno pivo");
    expect(html).toContain("Hladna pića");
    expect(html).toMatch(/<h1[^>]*>Sto <b>7<\/b><\/h1>/);
    expect(html).toContain("Bašta");
    expect(html).toContain("Pozovi konobara");
    // Prices come from the page, in the language's money format.
    expect(html).toMatch(/2,00\s*KM/);
    expect(html).toContain("<title>Sto 7 | Bricks</title>");
  });

  test("the sitemap does not list table pages", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).not.toContain("/s/");
  });

  test("another language with ?lang=", async ({ request }) => {
    const html = await (await request.get(`${table()}?lang=en`)).text();
    expect(html).toContain('<html lang="en"');
    expect(html).toMatch(/<h1[^>]*>Table <b>7<\/b><\/h1>/);
    expect(html).toContain("Call a waiter");
    expect(html).toContain("Draught beer");
    expect(html).toContain("order from here, pay the waiter");
  });

  test("the language comes from Accept-Language among the site's languages", async ({
    request,
  }) => {
    const html = await (
      await request.get(table(), { headers: { "accept-language": "de, en;q=0.8" } })
    ).text();
    expect(html).toContain('<html lang="en"');
  });
});

test.describe("invalid code, closed venue, module off", () => {
  test("an unknown code is a server-rendered 404 with the invalid-code text", async ({
    request,
  }) => {
    const response = await request.get(table("ZZZZZZZZZZ"));
    expect(response.status()).toBe(404);
    const html = await response.text();
    expect(html).toContain("Ovaj QR kod ne važi.");
    expect(html).toContain("Vjerovatno je sto premješten");
    expect(html).toMatch(/<meta name="robots" content="noindex, follow"\/?>/);
    expect(html).not.toContain('id="__next_error__"');
    expect(html).toContain('<html lang="bs"');
  });

  test("the invalid-code page looks right", async ({ page }, testInfo) => {
    await page.goto(table("ZZZZZZZZZZ"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ovaj QR kod ne važi.");
    await screenshots(page, testInfo, "order-invalid");
  });

  test("the invalid-code page in English", async ({ request }) => {
    const response = await request.get(`${table("ZZZZZZZZZZ")}?lang=en`);
    expect(response.status()).toBe(404);
    expect(await response.text()).toContain("This QR code is not valid.");
  });

  test("the module being off is a friendly page, not an error", async ({ page }, testInfo) => {
    const response = await page.goto(table(TOKENS.disabled));
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Naručivanje sa stola trenutno nije dostupno.",
    );
    await screenshots(page, testInfo, "order-disabled");
  });

  test("a closed venue says so and cannot be ordered from", async ({ page }, testInfo) => {
    await page.goto(table(TOKENS.closed));
    await expect(page.getByText("Trenutno ne primamo narudžbe.")).toBeVisible();
    await expect(page.getByText("Trenutno zatvoreno")).toBeVisible();
    await expect(page.getByRole("button", { name: "Dodaj Espresso" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Pregledaj narudžbu" })).toHaveCount(0);
    await screenshots(page, testInfo, "order-closed");
  });

  test("items that are 'nema' are shown and disabled", async ({ page }) => {
    await page.goto(table());
    await expect(page.getByText("Ledena kafa")).toBeVisible();
    await expect(page.getByRole("button", { name: "Dodaj Ledena kafa" })).toBeDisabled();
    await expect(page.getByText("Trenutno nema")).toBeVisible();
  });
});

test.describe("ordering", () => {
  test("menu, cart, note, order, number, live status, reload", async ({
    page,
    request,
  }, testInfo) => {
    const calls: string[] = [];
    page.on("request", (r) => calls.push(`${r.method()} ${r.url()}`));
    await page.goto(table());
    await expect(page.getByRole("heading", { name: "Sto 7" })).toBeVisible();
    // Nothing is in the basket: no order bar.
    await expect(page.getByRole("button", { name: "Pregledaj narudžbu" })).toHaveCount(0);

    await viewportShots(page, testInfo, "order-menu");

    await page.getByRole("button", { name: "Dodaj Espresso", exact: true }).click();
    await page.getByRole("button", { name: "Više: Espresso" }).click();
    await page.getByRole("button", { name: "Dodaj Bricks burger" }).click();
    // A size is a price of its own with its own stepper.
    await page.getByRole("button", { name: "Dodaj Točeno pivo 0,5 l" }).click();
    const bar = page.getByRole("button", { name: /Pregledaj narudžbu/ });
    await expect(bar).toContainText("4 stavke");
    // 2 x 2,00 + 12,50 + 5,00 = 21,50
    // (the money format of the browser's ICU: "21,50 KM", or "KM 21.50" where it has no Bosnian data)
    await expect(bar).toContainText(/21[.,]50/);

    await bar.click();
    const cart = page.getByRole("dialog", { name: "Tvoja narudžba" });
    await expect(cart).toBeVisible();
    await page.getByLabel("Napomena za konobara").fill("bez šećera, led sa strane");
    await viewportShots(page, testInfo, "order-cart");
    await page.getByRole("button", { name: "Naruči za sto 7" }).click();

    const status = page.getByRole("dialog", { name: "Narudžba primljena" });
    await expect(status).toBeVisible();
    await expect(status).toContainText("#1042");
    await expect(status).toContainText("Sto 7 · konobar je dobio narudžbu.");
    await expect(status.getByRole("listitem").filter({ hasText: "Primljena" })).toHaveAttribute(
      "data-state",
      "now",
    );
    await expect(status).toContainText("2× Espresso");
    await expect(status).toContainText("1× Točeno pivo (0,5 l)");
    await viewportShots(page, testInfo, "order-confirmation");

    // The browser sent only keys, price positions, quantities, the note and the language.
    const posted = await ordersPosted(request);
    expect(posted).toHaveLength(1);
    expect(posted[0]!.body).toEqual({
      items: [
        { itemKey: ITEMS.espresso, qty: 2 },
        { itemKey: ITEMS.burger, qty: 1 },
        { itemKey: ITEMS.beer, priceIndex: 1, qty: 1 },
      ],
      note: "bez šećera, led sa strane",
      locale: "bs",
    });
    // Straight to the API, not through the site's server.
    expect(
      calls.some((c) => c.startsWith("POST") && c.includes(`${API}/v1/public/ordering/tables/`)),
    ).toBe(true);
    expect(calls.filter((c) => c.includes("127.0.0.1:4011") && c.includes("/orders"))).toEqual([]);
    // The secret travelled in the header of the stream.
    await expect
      .poll(async () => (await page.evaluate(() => Object.keys(localStorage))).length)
      .toBe(1);

    // Staff move the order on: the page follows the stream.
    await request.get(`${API}/__ordering/advance`);
    await expect(page.getByRole("dialog", { name: "U pripremi" })).toBeVisible();
    await expect(
      page.getByRole("dialog").getByRole("listitem").filter({ hasText: "U pripremi" }),
    ).toHaveAttribute("data-state", "now");
    await expect(
      page.getByRole("dialog").getByRole("listitem").filter({ hasText: "Primljena" }),
    ).toHaveAttribute("data-state", "done");

    // A reload keeps the order: it is resumed from the browser's storage.
    await page.reload();
    const resumed = page.getByRole("dialog", { name: "U pripremi" });
    await expect(resumed).toBeVisible();
    await expect(resumed).toContainText("#1042");

    await request.get(`${API}/__ordering/advance`);
    await expect(page.getByRole("dialog", { name: "Poslužena" })).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("prijatno");
    await viewportShots(page, testInfo, "order-served");

    // Paid is final: the secret is forgotten.
    await request.get(`${API}/__ordering/advance`);
    await expect(page.getByRole("dialog", { name: "Plaćena" })).toBeVisible();
    await expect
      .poll(async () => (await page.evaluate(() => Object.keys(localStorage))).length)
      .toBe(0);
    await page.getByRole("button", { name: "Naruči još" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Pregledaj narudžbu/ })).toHaveCount(0);
  });

  test("a cancelled order shows its reason and is forgotten", async ({ page, request }) => {
    await page.goto(table());
    await placeOrderOf(page);
    await expect(page.getByRole("dialog", { name: "Narudžba primljena" })).toBeVisible();
    await request.get(
      `${API}/__ordering/advance?to=OTKAZANA&reason=${encodeURIComponent("Nema više burgera")}`,
    );
    const dialog = page.getByRole("dialog", { name: "Narudžba otkazana" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Razlog: Nema više burgera");
    await expect
      .poll(async () => (await page.evaluate(() => Object.keys(localStorage))).length)
      .toBe(0);
  });

  test("the basket survives a language switch", async ({ page }) => {
    await page.goto(table());
    await page.getByRole("button", { name: "Dodaj Espresso", exact: true }).click();
    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/lang=en/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("button", { name: /View order/ })).toContainText("1 item");
  });

  test("the sheet is a dialog: focus goes in, Escape closes, focus returns", async ({ page }) => {
    await page.goto(table());
    await page.getByRole("button", { name: "Dodaj Espresso", exact: true }).click();
    const bar = page.getByRole("button", { name: /Pregledaj narudžbu/ });
    await bar.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Tvoja narudžba" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Zatvori" })).toBeFocused();
    // Tab stays inside the dialog.
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(bar).toBeFocused();
  });

  test("the category bar jumps to a section", async ({ page }) => {
    await page.goto(table());
    const nav = page.getByRole("navigation", { name: "Kategorije" });
    await nav.getByRole("link", { name: "Hrana" }).click();
    await expect(page.getByRole("heading", { name: "Hrana" })).toBeInViewport();
  });
});

test.describe("errors", () => {
  test("an item that went 'nema' is marked in the basket", async ({ page }) => {
    await page.goto(table());
    await placeOrderOf(page, "#unavailable");
    const cart = page.getByRole("dialog", { name: "Tvoja narudžba" });
    await expect(cart.getByRole("alert")).toContainText("Neke stavke trenutno nema");
    await expect(cart.getByText("Trenutno nema", { exact: true })).toHaveCount(1);
    await expect(cart.getByRole("button", { name: "Naruči za sto 7" })).toBeEnabled();
  });

  test("a price change reloads the menu and keeps the basket", async ({ page }) => {
    await page.goto(table());
    await placeOrderOf(page, "#pricechanged");
    const cart = page.getByRole("dialog", { name: "Tvoja narudžba" });
    await expect(cart.getByRole("alert")).toContainText("Cijene su se promijenile");
    await expect(cart).toContainText("Espresso");
    await expect(cart).toContainText("Bricks burger");
  });

  test("too many orders says how long to wait", async ({ page }) => {
    await page.goto(table());
    await placeOrderOf(page, "#limit");
    await expect(page.getByRole("alert").filter({ hasText: "Previše pokušaja" })).toContainText(
      "30 s",
    );
  });

  test("a closed venue and a table that needs a waiter have their own words", async ({ page }) => {
    await page.goto(table());
    await placeOrderOf(page, "#waiter");
    await expect(page.getByRole("alert").filter({ hasText: "potreban konobar" })).toBeVisible();
  });

  test("the API not being reachable is told, and the basket stays", async ({ page }) => {
    await page.goto(table());
    await page.route(`${API}/v1/public/ordering/tables/*/orders`, (route) => route.abort());
    await placeOrderOf(page);
    await expect(page.getByRole("alert").filter({ hasText: "Nema veze" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Naruči za sto 7" })).toBeEnabled();
  });
});

test.describe("call a waiter", () => {
  test("a toast, and 'already called' the second time", async ({ page }, testInfo) => {
    await page.goto(table());
    const toast = page.getByRole("status", { name: "Obavijesti" });
    await page.getByRole("button", { name: "Pozovi konobara" }).click();
    await expect(toast).toHaveText("Konobar dolazi za sto 7");
    await viewportShots(page, testInfo, "order-call");
    await page.getByRole("button", { name: "Pozovi konobara" }).click();
    await expect(toast).toHaveText("Konobar je već pozvan");
  });

  test("the button is not there when the venue switched calls off", async ({ page }) => {
    await page.goto(table(TOKENS.noCalls));
    await expect(page.getByRole("heading", { name: "Sto 3" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pozovi konobara" })).toHaveCount(0);
  });
});
