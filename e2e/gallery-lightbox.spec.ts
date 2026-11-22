import { expect, test } from "@playwright/test";
import { viewportShots } from "./support/shots.ts";

const TOTAL = 7;

test.describe("gallery lightbox", () => {
  test("a click opens the picture full size, the arrows and buttons move, Esc and the close button leave", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    const grid = page.locator("#galerija .gal-grid");
    await expect(grid.locator(".ph")).toHaveCount(TOTAL);
    const second = grid.locator(".ph-open").nth(1);
    await expect(second).toHaveAccessibleName("Fotografija 2: otvori u punoj veličini");

    await second.scrollIntoViewIfNeeded();
    await second.click();
    const dialog = page.getByRole("dialog", { name: "Galerija, puna veličina" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".lb-counter")).toHaveText(`2 / ${TOTAL}`);
    await expect(dialog.getByRole("img")).toHaveAttribute("alt", "Fotografija 2");
    await expect(dialog.getByRole("img")).toHaveAttribute("sizes", "100vw");
    await expect(dialog.locator("figcaption")).toHaveText("Točenje");
    // The page behind does not scroll.
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    await viewportShots(page, testInfo, "gallery-lightbox");

    await page.keyboard.press("ArrowRight");
    await expect(dialog.locator(".lb-counter")).toHaveText(`3 / ${TOTAL}`);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(dialog.locator(".lb-counter")).toHaveText(`1 / ${TOTAL}`);
    // Wraps around backwards, then forwards.
    await page.keyboard.press("ArrowLeft");
    await expect(dialog.locator(".lb-counter")).toHaveText(`${TOTAL} / ${TOTAL}`);
    await dialog.getByRole("button", { name: "Sljedeća fotografija" }).click();
    await expect(dialog.locator(".lb-counter")).toHaveText(`1 / ${TOTAL}`);
    await dialog.getByRole("button", { name: "Prethodna fotografija" }).click();
    await expect(dialog.locator(".lb-counter")).toHaveText(`${TOTAL} / ${TOTAL}`);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(second).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");

    await second.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Zatvori" }).click();
    await expect(dialog).toBeHidden();
    await expect(second).toBeFocused();
  });

  test("Enter on a focused picture opens it, a click on the backdrop closes it", async ({
    page,
  }) => {
    await page.goto("/");
    const first = page.locator("#galerija .ph-open").first();
    await first.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".lb-counter")).toHaveText(`1 / ${TOTAL}`);
    await dialog.click({ position: { x: 150, y: 300 } });
    await expect(dialog).toBeHidden();
    await expect(first).toBeFocused();
  });

  test("390 px: a swipe changes the picture and the buttons are 56 px", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const first = page.locator("#galerija .ph-open").first();
    await first.scrollIntoViewIfNeeded();
    await first.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".lb-counter")).toHaveText(`1 / ${TOTAL}`);
    for (const name of ["Zatvori", "Prethodna fotografija", "Sljedeća fotografija"]) {
      const box = await dialog.getByRole("button", { name }).boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(56);
      expect(box?.height).toBeGreaterThanOrEqual(56);
    }
    await dialog.locator(".lb-panel").evaluate((panel) => {
      const touch = (type: string, x: number) => {
        const point = new Touch({ identifier: 1, target: panel, clientX: x, clientY: 400 });
        panel.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            touches: type === "touchend" ? [] : [point],
            changedTouches: [point],
          }),
        );
      };
      touch("touchstart", 300);
      touch("touchend", 100);
    });
    await expect(dialog.locator(".lb-counter")).toHaveText(`2 / ${TOTAL}`);
    await viewportShots(page, testInfo, "gallery-lightbox-swipe");
  });

  test("en: the labels are in English", async ({ page }) => {
    await page.goto("/en");
    const first = page.locator("#galerija .ph-open").first();
    await expect(first).toHaveAccessibleName("Fotografija 1: open full size");
    await first.scrollIntoViewIfNeeded();
    await first.click();
    const dialog = page.getByRole("dialog", { name: "Gallery, full size" });
    await expect(dialog.getByRole("button", { name: "Next photo" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close" })).toBeVisible();
  });
});
