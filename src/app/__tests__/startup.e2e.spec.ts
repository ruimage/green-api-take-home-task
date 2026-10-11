import { expect, test } from "@playwright/test";

test.describe("the host page without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("renders its heading and description from HTML", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "GREEN-API Messenger" })).toBeVisible();
    await expect(
      page.getByText("Демонстрационная страница для встраивания чат-виджета.", { exact: true }),
    ).toBeVisible();
  });
});

for (const [name, viewport] of [
  ["desktop", { width: 1280, height: 800 }],
  ["mobile", { width: 390, height: 844 }],
] as const) {
  test(`${name}: renders the static host and opens the React widget`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const requestedScripts: string[] = [];
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (request.resourceType() === "script") requestedScripts.push(pathname);
    });
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: "GREEN-API Messenger" })).toBeVisible();
    await expect(page.locator('script[type="module"][src]')).toHaveCount(1);
    await expect(page.locator("script:not([src]), script[data-messenger-widget]")).toHaveCount(0);
    expect(requestedScripts).not.toContain("/widget.js");
    await expect(page.locator("style[data-critical]")).toHaveCount(1);
    expect(await page.locator("style[data-critical]").textContent()).toContain(
      ".messenger-launcher",
    );

    const launcher = page.getByRole("button", { name: "Открыть чат" });
    await expect(launcher).toBeInViewport();
    await expect(launcher).toHaveCSS("background-color", "rgb(0, 133, 255)");
    await expect(page.getByLabel("idInstance", { exact: true })).toHaveCount(0);
    const initialOverflow = await page.evaluate(() => document.body.style.overflow);
    await launcher.click();

    await expect(page.getByLabel("idInstance", { exact: true })).toBeVisible();
    await expect(page.getByLabel("idInstance", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("apiTokenInstance", { exact: true })).toHaveValue("");
    await expect(page.getByRole("button", { name: "Закрыть чат" })).toBeInViewport();
    await expect(page.getByRole("form", { name: "Подключение чата" })).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    if (name === "mobile") {
      await expect(page.getByRole("dialog", { name: "Чат", exact: true })).toBeVisible();
      await expect(page.getByLabel("idInstance", { exact: true })).toBeFocused();
      await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    }

    await page.getByRole("button", { name: "Закрыть чат" }).click();
    await expect(page.getByLabel("idInstance", { exact: true })).toHaveCount(0);
    await expect(launcher).toBeInViewport();
    if (name === "mobile") {
      await expect(launcher).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe(initialOverflow);
    }

    await launcher.click();
    await expect(page.getByLabel("idInstance", { exact: true })).toBeVisible();
    await expect(page.getByLabel("apiTokenInstance", { exact: true })).toHaveValue("");
    expect(pageErrors).toEqual([]);
  });
}
