import { expect, test } from "@playwright/test";

test.describe("menu search", () => {
  test("filters the dishes that are already on the page, and the sections left empty", async ({
    page,
  }) => {
    await page.goto("/");
    const coffee = page.locator("#coffee");
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    const dishes = coffee.locator(".menu-item:not([hidden])");
    await expect(dishes).toHaveCount(7);

    const search = coffee.getByRole("searchbox", { name: "Traži u meniju" });
    await search.fill("limunada");
    await expect(dishes).toHaveCount(1);
    await expect(dishes).toContainText("Prirodna limunada");
    // The section that has no match is gone, the other stays.
    await expect(coffee.locator(".menu-cat:not([hidden])")).toHaveCount(1);

    // Without accents and by label: "vegan" finds the dishes with the vegan mark.
    await search.fill("caj");
    await expect(dishes).toHaveText(/Čaj od nane/);
    await search.fill("veganski");
    await expect(dishes).toHaveCount(3);

    await search.fill("nema ništa takvo");
    await expect(dishes).toHaveCount(0);
    await expect(coffee.getByRole("status")).toHaveText(/Ništa nije pronađeno/);

    await search.fill("");
    await expect(dishes).toHaveCount(7);
    // The list was filtered where it is: the page fetched no data for it.
    expect(requests.filter((url) => url.includes("/v1/") || url.includes("_rsc"))).toEqual([]);
  });

  test("one menu's search does not touch the other", async ({ page }) => {
    await page.goto("/");
    await page.locator("#coffee").getByRole("searchbox").fill("espresso");
    await expect(page.locator("#beer .menu-item:not([hidden])")).toHaveCount(5);
  });
});
