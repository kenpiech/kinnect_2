import { clerk } from "@clerk/testing/playwright";
import { expect, type Browser, type Page } from "@playwright/test";

// Shared by the end-to-end tests: sign a test reader in, and get past the
// avatar picker a brand-new account sees first.

export const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function signIn(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  return page;
}

// A brand-new account is asked to pick an avatar before anything else. The
// picker streams in after the page, so wait for it (isVisible() wouldn't).
export async function pickAvatarIfAsked(page: Page) {
  const heading = page.getByRole("heading", { name: /Pick your avatar/ });
  const asked = await heading
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (asked) {
    await page.getByRole("radio", { name: "Round glasses" }).check({ force: true });
    await page.getByRole("button", { name: "Use this avatar" }).click();
    await expect(heading).toBeHidden();
  }
}
