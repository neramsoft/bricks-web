import { expect, test, type APIRequestContext } from "@playwright/test";
import { screenshots } from "./support/shots.ts";

const API = "http://127.0.0.1:4010";

interface Post {
  path: string;
  headers: Record<string, string>;
  body: { values?: Record<string, unknown>; website?: string; pagePath?: string };
}
const posts = async (request: APIRequestContext) =>
  ((await (await request.get(`${API}/__posts`)).json()) as Post[]).filter((post) =>
    post.path.includes("/submissions"),
  );

test.beforeEach(async ({ request }) => {
  await request.get(`${API}/__reset`);
});

async function fill(page: import("@playwright/test").Page) {
  const form = page.locator("#rezervacija form");
  await form.getByLabel("Ime i prezime").fill("Amra Hodžić");
  await form.getByLabel("Telefon").fill("+387 61 123 456");
  await form.getByLabel("Datum i vrijeme").fill("2026-12-05T20:30");
  await form.getByLabel("Broj osoba").fill("4");
  return form;
}

test.describe("the reservation form", () => {
  test("with script: the answer shows in place, signed, with the page's values", async ({
    page,
    request,
  }, testInfo) => {
    await page.goto("/");
    const form = await fill(page);
    await form.getByRole("button", { name: "Pošalji rezervaciju" }).click();
    await expect(form.locator(".form-status")).toHaveText("Hvala, primili smo rezervaciju.");
    // The URL did not change: nothing was navigated.
    expect(new URL(page.url()).pathname).toBe("/");
    const [sent] = await posts(request);
    expect(sent?.body.values).toEqual({
      ime: "Amra Hodžić",
      telefon: "+387 61 123 456",
      kad: "2026-12-05T20:30",
      osobe: 4,
    });
    expect(sent?.body.pagePath).toBe("/");
    // The site vouches for when the page was drawn (docs: signFormVisit).
    expect(sent?.headers["x-probiz-site-signature"]).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    await screenshots(page, testInfo, "reservation-sent-js");
  });

  test("with script: the API's field problems show at their fields", async ({ page }) => {
    await page.goto("/");
    const form = page.locator("#rezervacija form");
    await form.getByLabel("Ime i prezime").fill("Amra");
    await form.getByLabel("Telefon").fill("+387 61 123 456");
    await form.getByLabel("Datum i vrijeme").fill("2026-12-05T20:30");
    // Over the form's maximum: the browser would stop it, so the check is made by the API alone.
    await form.getByLabel("Broj osoba").evaluate((input: HTMLInputElement) => {
      input.removeAttribute("max");
      input.value = "40";
    });
    await form.evaluate((element: HTMLFormElement) => (element.noValidate = true));
    await form.getByRole("button", { name: "Pošalji rezervaciju" }).click();
    await expect(form.locator(".form-status")).toHaveText("Provjeri označena polja.");
    await expect(form.getByLabel("Broj osoba")).toHaveAttribute("aria-invalid", "true");
    await expect(form.locator(".field-error")).toHaveCount(1);
  });

  test("without script: the browser posts, and a thank-you page follows", async ({
    browser,
    request,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 900 },
      locale: "bs-BA",
    });
    const page = await context.newPage();
    await page.goto("/");
    const form = await fill(page);
    await Promise.all([
      page.waitForURL(/\/~form\/bs\?s=sent/),
      form.getByRole("button", { name: "Pošalji rezervaciju" }).click(),
    ]);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hvala, primili smo poruku.");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
    // The way back is the page and the form's own place on it.
    await expect(page.getByRole("link", { name: "Nazad na stranicu" })).toHaveAttribute(
      "href",
      "/#rezervacija",
    );
    const [sent] = await posts(request);
    expect(sent?.body.values?.ime).toBe("Amra Hodžić");
    expect(sent?.headers["x-probiz-site-signature"]).toMatch(/^t=\d+,v1=/);
    // Without script nothing can scroll the pictures in: the page is short and has none below.
    await screenshots(page, testInfo, "reservation-thanks-nojs", { scroll: false });
    await context.close();
  });

  test("without script: an invalid post lands on the problem page", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, locale: "bs-BA" });
    const page = await context.newPage();
    await page.goto("/");
    const form = page.locator("#rezervacija form");
    // Empty required fields are caught by the browser; take that off to reach the API's answer.
    await form.evaluate((element: HTMLFormElement) => element.setAttribute("novalidate", ""));
    await Promise.all([
      page.waitForURL(/s=invalid/),
      form.getByRole("button", { name: "Pošalji rezervaciju" }).click(),
    ]);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Poruka nije poslana.");
    await context.close();
  });

  test("a bot's filled trap goes to the API as the honeypot", async ({ page, request }) => {
    await page.goto("/");
    const form = await fill(page);
    await form
      .locator('input[name="website"]')
      .evaluate((input: HTMLInputElement) => (input.value = "http://spam"));
    await form.getByRole("button", { name: "Pošalji rezervaciju" }).click();
    await expect.poll(async () => (await posts(request)).length).toBe(1);
    expect((await posts(request))[0]?.body.website).toBe("http://spam");
  });

  test("a post from another site is refused", async ({ request }) => {
    const response = await request.post("/api/forms/00000000-0000-4000-8000-000000000900", {
      headers: { origin: "https://evil.example", accept: "application/json" },
      form: { ime: "x" },
    });
    expect(response.status()).toBe(403);
    expect(await posts(request)).toHaveLength(0);
  });
});
