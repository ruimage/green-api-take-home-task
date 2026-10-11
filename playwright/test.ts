import { expect, test as base } from "@playwright/test";

export { expect } from "@playwright/test";

export const test = base.extend<{ externalRequests: void }>({
  externalRequests: [
    async ({ context, baseURL }, use) => {
      if (!baseURL) throw new Error("Component tests require a local baseURL.");
      const localOrigin = new URL(baseURL).origin;
      const blockedOrigins = new Set<string>();
      await context.route("**/*", async (route) => {
        const origin = new URL(route.request().url()).origin;
        if (origin === localOrigin) {
          await route.continue();
        } else {
          blockedOrigins.add(origin);
          await route.abort("blockedbyclient");
        }
      });
      await use();
      expect(
        [...blockedOrigins],
        "Component stories must use stub data without external HTTP.",
      ).toEqual([]);
    },
    { auto: true },
  ],
});
