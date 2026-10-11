import { expect, test } from "../../../../../../../playwright/test";

test("mobile FAB opens a full-screen modal and closing restores focus and scrolling", async ({
  mount,
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const component = await mount("App/Default");
  const launcher = component.getByRole("button", { name: "Открыть чат" });
  expect(await launcher.boundingBox()).toEqual({ x: 318, y: 772, width: 56, height: 56 });
  await expect(launcher.locator("svg")).toBeVisible();
  await expect(launcher.locator("span")).toBeHidden();
  expect(await launcher.evaluate((element) => getComputedStyle(element).borderRadius)).toBe("50%");
  await page.screenshot({ path: "test-results/ct/mobile-fab.png" });
  await launcher.click();
  const dialog = component.getByRole("dialog", { name: "Чат", exact: true });
  await expect(dialog).toBeVisible();
  expect(await dialog.boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 844 });
  expect(await dialog.evaluate((element) => element.matches(":modal"))).toBe(true);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await expect(dialog.getByLabel("idInstance")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.screenshot({ path: "test-results/ct/mobile-connection.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(launcher).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  await launcher.click();
  await component.getByRole("button", { name: "Закрыть чат" }).click();
  await expect(dialog).toHaveCount(0);
});

test("mobile conversation keeps the composer visible when the visual viewport shrinks", async ({
  mount,
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const component = await mount("App/WhatsAppConversation");
  await component.getByRole("button", { name: "Открыть чат" }).click();
  await component.getByRole("button", { name: "Подключить", exact: true }).click();
  await component.getByLabel("Номер телефона получателя").fill("+12345678901");
  await component.getByRole("button", { name: "Создать чат", exact: true }).click();
  const dialog = component.getByRole("dialog", { name: "Чат", exact: true });
  const input = dialog.getByRole("textbox", { name: "Текст сообщения" });
  await input.fill("Мобильное сообщение");
  await dialog.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(dialog.getByText("Привет! Сообщение получил.", { exact: true })).toBeVisible();
  await input.fill("Сохранённый черновик");
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "height", { configurable: true, value: 400 });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect.poll(async () => (await dialog.boundingBox())?.height).toBe(400);
  const composer = dialog.getByRole("form", { name: "Отправка сообщения" });
  const box = await composer.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(400);
  await expect(dialog.getByRole("button", { name: "Закрыть чат" })).toBeInViewport();
  await expect(input).toHaveValue("Сохранённый черновик");
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: "test-results/ct/mobile-keyboard-viewport.png" });
  await page.evaluate(() => {
    Reflect.deleteProperty(window.visualViewport!, "height");
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(dialog).toHaveCount(0);
  await expect(component.getByRole("textbox", { name: "Текст сообщения" })).toHaveValue(
    "Сохранённый черновик",
  );
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});
