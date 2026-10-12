import type { Locator, Page } from "@playwright/test";

import { expect, test } from "../../../../../playwright/test";

async function expectDescription(page: Page, input: Locator, text: string) {
  const descriptionId = await input.getAttribute("aria-describedby");
  expect(descriptionId).toBeTruthy();
  const description = page.locator(`[id="${descriptionId}"]`);
  await expect(description).toBeVisible();
  await expect(description).toHaveText(text);
}

const privacy = "Данные подключения хранятся только в памяти этой сессии.";

test("missing API URL reveals a required field and uses the manually entered endpoint", async ({
  mount,
}) => {
  const component = await mount("App/RestConnection");
  await component.getByRole("button", { name: "Открыть чат" }).click();
  const form = component.getByRole("form", { name: "Подключение чата" });
  const apiUrl = form.getByLabel("ApiUrl", { exact: true });
  const submit = form.getByRole("button", { name: "Подключить", exact: true });
  await expect(apiUrl).toBeVisible();
  await expect(apiUrl).toHaveValue("");
  await submit.click();
  await expect(apiUrl).toBeFocused();
  await expect(form.getByRole("alert")).toHaveText("Введите ApiUrl.");
  await apiUrl.fill("ftp://example.invalid");
  await submit.click();
  await expect(apiUrl).toHaveAttribute("aria-invalid", "true");
  await apiUrl.fill("https://example.invalid/");
  await expect(apiUrl).toHaveAttribute("aria-invalid", "false");
  await submit.click();
  await expect(form.getByRole("alert")).toContainText("не авторизован");
});

test("configured API URL hides the manual field", async ({ mount }) => {
  const component = await mount("App/RestConnection", { apiUrl: "https://example.invalid" });
  await component.getByRole("button", { name: "Открыть чат" }).click();
  await expect(component.getByLabel("ApiUrl", { exact: true })).toHaveCount(0);
  await component.getByRole("button", { name: "Подключить", exact: true }).click();
  await expect(component.getByRole("alert")).toContainText("не авторизован");
});

test("connection fields reveal validation on submit and focus the first invalid field", async ({
  mount,
  page,
}) => {
  const component = await mount("App/ConnectionPending");
  await component.getByRole("button", { name: "Открыть чат" }).click();
  const form = component.getByRole("form", { name: "Подключение чата" });
  const instance = form.getByLabel("idInstance", { exact: true });
  const token = form.getByLabel("apiTokenInstance", { exact: true });
  const submit = form.getByRole("button", { name: "Подключить", exact: true });

  await expect(instance).toBeFocused();
  await instance.fill("invalid-instance");
  await expect(form.getByRole("alert")).toHaveCount(0);
  await expect(instance).toHaveAttribute("aria-invalid", "false");
  await expect(token).toHaveAttribute("aria-invalid", "false");
  await expectDescription(page, token, privacy);

  await submit.click();
  await expect(instance).toBeFocused();
  await expect(form.getByRole("alert")).toHaveCount(2);
  await expect(instance).toHaveAttribute("aria-invalid", "true");
  await expect(token).toHaveAttribute("aria-invalid", "true");
  await expectDescription(page, instance, "idInstance должен содержать только цифры.");
  await expectDescription(page, token, "Введите apiTokenInstance.");

  await instance.fill("123456");
  await expect(instance).toHaveAttribute("aria-invalid", "false");
  await expect(instance).not.toHaveAttribute("aria-describedby");
  await expect(form.getByRole("alert")).toHaveCount(1);
  await submit.click();
  await expect(token).toBeFocused();

  await token.fill("ct-test-token");
  await expect(token).toHaveAttribute("aria-invalid", "false");
  await expect(form.getByRole("alert")).toHaveCount(0);
  await expectDescription(page, token, privacy);
});

test("pending connection disables edits and cancellation resets validation before reopening", async ({
  mount,
  page,
}) => {
  const component = await mount("App/ConnectionPending");
  const launcher = component.getByRole("button", { name: "Открыть чат" });
  await launcher.click();
  const form = component.getByRole("form", { name: "Подключение чата" });
  const instance = form.getByLabel("idInstance", { exact: true });
  const token = form.getByLabel("apiTokenInstance", { exact: true });
  await instance.fill("123456");
  await token.fill("ct-test-token");
  await form.getByRole("button", { name: "Подключить", exact: true }).click();

  await expect(form).toHaveAttribute("aria-busy", "true");
  await expect(instance).toBeDisabled();
  await expect(token).toBeDisabled();
  await expect(form.locator('button[type="submit"]')).toBeDisabled();
  const cancel = form.getByRole("button", { name: "Отменить подключение", exact: true });
  await expect(cancel).toBeEnabled();
  await cancel.click();

  await expect(form).toHaveAttribute("aria-busy", "false");
  await expect(cancel).toHaveCount(0);
  await expect(instance).toBeEnabled();
  await expect(token).toBeEnabled();
  await expect(instance).toHaveValue("");
  await expect(token).toHaveValue("");
  await expect(instance).toHaveAttribute("aria-invalid", "false");
  await expect(token).toHaveAttribute("aria-invalid", "false");
  await expect(form.getByRole("alert")).toHaveCount(0);
  const submit = form.getByRole("button", { name: "Подключить", exact: true });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(form.getByRole("alert")).toHaveCount(2);

  await component.getByRole("button", { name: "Закрыть чат" }).click();
  await expect(form).toHaveCount(0);
  await launcher.click();
  await expect(instance).toBeFocused();
  await expect(form.getByRole("alert")).toHaveCount(0);
  await expect(instance).toHaveAttribute("aria-invalid", "false");
  await expect(token).toHaveAttribute("aria-invalid", "false");
  await expectDescription(page, token, privacy);
});
