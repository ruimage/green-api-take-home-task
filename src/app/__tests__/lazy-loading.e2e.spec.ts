import { expect, test, type Page } from "@playwright/test";

function observeScripts(page: Page) {
  const requests: string[] = [];
  const sources = new Map<string, Promise<string>>();
  page.on("request", (request) => {
    if (request.resourceType() === "script") requests.push(request.url());
  });
  page.on("response", (response) => {
    if (response.request().resourceType() === "script")
      sources.set(response.url(), response.text());
  });
  return {
    requests,
    async source() {
      return (await Promise.all(sources.values())).join("\n");
    },
  };
}

async function mockGreenApi(page: Page) {
  const endpoints: string[] = [];
  const unexpectedRequests: string[] = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === "127.0.0.1") {
      await route.continue();
      return;
    }
    if (url.hostname !== "api.green-api.com") {
      unexpectedRequests.push(request.url());
      await route.abort();
      return;
    }
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const endpoint = url.pathname.split("/")[2];
    endpoints.push(endpoint ?? "");
    let response: unknown;
    switch (endpoint) {
      case "getStateInstance":
        response = { stateInstance: "authorized" };
        break;
      case "checkWhatsapp":
        response = { existsWhatsapp: true };
        break;
      case "receiveNotification":
        response = null;
        break;
      case "sendMessage":
        response = { idMessage: "lazy-loading-message" };
        break;
      default:
        unexpectedRequests.push(request.url());
        await route.abort();
        return;
    }
    await route.fulfill({ headers, json: response });
  });
  return { endpoints, unexpectedRequests };
}

async function submitConnection(page: Page) {
  await page.getByLabel("idInstance", { exact: true }).fill("123");
  await page.getByLabel("apiTokenInstance", { exact: true }).fill("test-token");
  await page.getByLabel("ApiUrl", { exact: true }).fill("https://api.green-api.com");
  await page.getByRole("button", { name: "Подключить", exact: true }).click();
}

async function connect(page: Page) {
  await submitConnection(page);
  await expect(page.getByRole("form", { name: "Новый чат", exact: true })).toBeVisible();
}

async function openConversation(page: Page) {
  await page.getByLabel("Номер телефона получателя", { exact: true }).fill("+79991234567");
  await page.getByRole("button", { name: "Создать чат", exact: true }).click();
  await expect(page.getByRole("region", { name: "Выбранный чат", exact: true })).toBeVisible();
}

test("opens the connection form immediately and loads later screens at their workflow stages", async ({
  page,
}) => {
  const scripts = observeScripts(page);
  const api = await mockGreenApi(page);
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Открыть чат" })).toBeVisible();

  const initialRequests = scripts.requests.length;
  const initialSource = await scripts.source();
  expect(initialSource).toContain("Подключение чата");
  expect(initialSource).not.toContain("Номер телефона получателя");
  expect(initialSource).not.toContain("Выбранный чат");
  expect(api.endpoints).toEqual([]);

  await page.getByRole("button", { name: "Открыть чат" }).click();
  await expect(page.getByLabel("idInstance", { exact: true })).toBeVisible();
  expect(scripts.requests).toHaveLength(initialRequests);
  const connectionRequests = scripts.requests.length;
  const connectionSource = await scripts.source();
  expect(connectionSource).toContain("Подключение чата");
  expect(connectionSource).not.toContain("Номер телефона получателя");
  expect(connectionSource).not.toContain("Выбранный чат");

  await page.getByRole("button", { name: "Подключить", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(3);
  expect(scripts.requests).toHaveLength(connectionRequests);
  expect(api.endpoints).toEqual([]);

  await connect(page);
  expect(scripts.requests.length).toBeGreaterThan(connectionRequests);
  const phoneRequests = scripts.requests.length;
  const phoneSource = await scripts.source();
  expect(phoneSource).toContain("Номер телефона получателя");
  expect(phoneSource).not.toContain("Выбранный чат");
  expect(api.endpoints).toEqual(["getStateInstance"]);

  await page.getByLabel("Номер телефона получателя", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Создать чат", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Введите номер с кодом страны: от 10 до 15 цифр.",
  );
  expect(scripts.requests).toHaveLength(phoneRequests);

  await openConversation(page);
  expect(scripts.requests.length).toBeGreaterThan(phoneRequests);
  expect(await scripts.source()).toContain("Выбранный чат");
  expect(api.endpoints).toContain("checkWhatsapp");
  await page.getByLabel("Текст сообщения", { exact: true }).fill("Проверка ленивой загрузки");
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(page.getByText("Проверка ленивой загрузки", { exact: true })).toBeVisible();
  await expect.poll(() => api.endpoints).toContain("sendMessage");

  const loadedRequests = [...scripts.requests];
  await page.getByRole("button", { name: "Закрыть чат" }).click();
  await page.getByRole("button", { name: "Открыть чат" }).click();
  await expect(page.getByLabel("idInstance", { exact: true })).toBeVisible();
  await connect(page);
  await openConversation(page);
  expect(scripts.requests).toEqual(loadedRequests);
  expect(new Set(scripts.requests).size).toBe(scripts.requests.length);
  expect(api.unexpectedRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("allows closing while the phone form chunk is still loading", async ({ page }) => {
  const scripts = observeScripts(page);
  const api = await mockGreenApi(page);
  let delayScripts = false;
  let releaseScripts: () => void = () => {};
  const scriptGate = new Promise<void>((resolve) => {
    releaseScripts = resolve;
  });
  await page.route("**/*.js", async (route) => {
    if (delayScripts) await scriptGate;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "networkidle" });
  const initialRequests = scripts.requests.length;
  delayScripts = true;
  try {
    await page.getByRole("button", { name: "Открыть чат" }).click();
    await expect(page.getByLabel("idInstance", { exact: true })).toBeVisible();
    expect(scripts.requests).toHaveLength(initialRequests);
    await submitConnection(page);
    await expect(page.getByRole("status")).toHaveText("Загружаем форму…");
    await expect.poll(() => scripts.requests.length).toBeGreaterThan(initialRequests);
    await page.getByRole("button", { name: "Закрыть чат" }).click();
    await expect(page.getByRole("button", { name: "Открыть чат" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Открыть чат" })).toBeFocused();
    await expect(page.getByRole("status")).toHaveCount(0);
    releaseScripts();
    await page.waitForLoadState("networkidle");
    await expect(page.getByLabel("idInstance", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("form", { name: "Новый чат", exact: true })).toHaveCount(0);
    const loadedRequests = [...scripts.requests];

    await page.getByRole("button", { name: "Открыть чат" }).click();
    await expect(page.getByLabel("idInstance", { exact: true })).toBeVisible();
    expect(scripts.requests).toEqual(loadedRequests);
    await connect(page);
    expect(scripts.requests).toEqual(loadedRequests);
    expect(new Set(scripts.requests).size).toBe(scripts.requests.length);
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(api.unexpectedRequests).toEqual([]);
  } finally {
    releaseScripts();
  }
});

test("keeps connection available when the phone form chunk cannot be downloaded", async ({
  page,
}) => {
  const pageErrors: Error[] = [];
  const failedScripts: string[] = [];
  const api = await mockGreenApi(page);
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/", { waitUntil: "networkidle" });
  await page.route("**/*.js", async (route) => {
    failedScripts.push(route.request().url());
    await route.abort("failed");
  });

  const launcher = page.getByRole("button", { name: "Открыть чат" });
  const error = page.getByRole("alert");
  const close = page.getByRole("button", { name: "Закрыть чат" });
  await launcher.click();
  await expect(page.getByLabel("idInstance", { exact: true })).toBeVisible();
  expect(failedScripts).toEqual([]);
  await submitConnection(page);
  await expect(error).toHaveText("Не удалось загрузить чат. Обновите страницу.");
  expect(failedScripts.length).toBeGreaterThan(0);
  await expect(close).toBeEnabled();
  await expect(page.getByLabel("idInstance", { exact: true })).toHaveCount(0);

  await close.click();
  await expect(error).toHaveCount(0);
  await expect(launcher).toBeVisible();
  await expect(launcher).toBeFocused();
  const failedRequests = [...failedScripts];

  await launcher.click();
  await expect(page.getByLabel("idInstance", { exact: true })).toBeVisible();
  await expect(error).toHaveCount(0);
  expect(failedScripts).toEqual(failedRequests);
  await submitConnection(page);
  await expect(error).toHaveText("Не удалось загрузить чат. Обновите страницу.");
  await expect(close).toBeEnabled();
  await expect(page.getByLabel("idInstance", { exact: true })).toHaveCount(0);
  expect(failedScripts).toEqual(failedRequests);
  expect(api.unexpectedRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});
