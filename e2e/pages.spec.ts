import { expect, test } from "@playwright/test";
import { jsonLd, screenshots, typesOf } from "./support/shots.ts";

test.describe("a venue page and a legal page", () => {
  test("/tuzla: the details, the map link and the breadcrumbs", async ({ page }, testInfo) => {
    const response = await page.goto("/tuzla");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bricks Tuzla");

    const crumbs = page.getByRole("navigation", { name: "Putanja" });
    await expect(crumbs.getByRole("link", { name: "Početna" })).toHaveAttribute("href", "/");
    await expect(crumbs.locator('[aria-current="page"]')).toHaveText("Bricks Tuzla");

    await expect(page.locator(".contact-grid")).toContainText("Slatina do br. 14");
    await expect(page.locator(".contact-grid")).toContainText("rezervacije@bricks.ba");
    await expect(page.locator("main").getByRole("link", { name: "Navigacija" })).toBeVisible();

    const nodes = await jsonLd(page);
    const trail = nodes.find((node) => typesOf(node).includes("BreadcrumbList"));
    expect(trail?.itemListElement).toHaveLength(2);
    // The page shows the hours and the map, so the business's node carries them.
    const business = nodes.find((node) => typesOf(node).includes("BarOrPub"));
    expect(business).toHaveProperty("geo");
    expect(business).toHaveProperty("openingHoursSpecification");
    expect(business).not.toHaveProperty("hasMenu");
    await screenshots(page, testInfo, "venue");
  });

  test("/privatnost: the title, the text and the trail", async ({ page }, testInfo) => {
    const response = await page.goto("/privatnost");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Politika privatnosti");
    await expect(page.locator("main")).toContainText("Ova politika opisuje");
    const crumbs = page.getByRole("navigation", { name: "Putanja" });
    await expect(crumbs.locator("li")).toHaveText(["Početna", "Politika privatnosti"]);
    const nodes = await jsonLd(page);
    expect(nodes.filter((node) => typesOf(node).includes("BreadcrumbList"))).toHaveLength(1);
    // Nothing on the page shows hours, a map or a menu, so the business is not described again.
    expect(nodes.some((node) => typesOf(node).includes("BarOrPub"))).toBe(false);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index/);
    await screenshots(page, testInfo, "legal");
  });

  test("robots.txt and sitemap.xml come from the CMS", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain("User-agent: *");
    const sitemap = await request.get("/sitemap.xml");
    expect(await sitemap.text()).toContain("<loc>http://127.0.0.1:4011/tuzla</loc>");
  });
});
