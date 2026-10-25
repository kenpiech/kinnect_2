import { expect, test, type Page } from "@playwright/test";
import { escape, pickAvatarIfAsked, signIn } from "./helpers";
import { READERS } from "./readers";

// The rule lib2 follows: your library is private, and your posts are shared
// with your friends. Reader A and Reader B are not friends, so B must see
// neither A's post nor A's book.
//
// Nothing in the app filters by user: what each reader gets back is decided
// by row-level security in Supabase. Loosen the "read mine and my friends'
// posts" policy to `using (true)` and this test fails; restore it and it passes.

const library = (page: Page) => page.locator('section[aria-labelledby="library-heading"]');
const results = (page: Page) => page.locator('section[aria-labelledby="search-heading"] li');

test("two readers who aren't friends can't see each other's posts or books", async ({ browser }) => {
  const secret = `A's private test post ${Date.now()}`;

  // Reader A saves a book from Open Library and posts about it
  const a = await signIn(browser, READERS.a.email);
  await a.goto("/library");
  await pickAvatarIfAsked(a);
  await a.getByLabel("Search Open Library").fill("fantastic mr fox");
  await a.getByRole("button", { name: "Search", exact: true }).click();
  const first = results(a).first();
  await expect(first).toBeVisible({ timeout: 30_000 });
  const title = (await first.locator("p").first().innerText()).trim();
  const save = first.getByRole("button", { name: /^Save / });
  if (await save.isVisible()) await save.click();
  await expect(library(a)).toContainText(title);

  await a.goto("/post/new");
  await a.getByLabel("What are you reading?").fill(secret);
  await a.getByRole("radio", { name: new RegExp(escape(title)) }).check();
  await a.getByRole("button", { name: "Post about this book" }).click();
  await a.waitForURL("**/feed");
  await expect(a.getByText(secret), "A sees their own post").toBeVisible();

  try {
    // Reader B, not A's friend, looks at their own feed and library
    const b = await signIn(browser, READERS.b.email);
    await b.goto("/feed");
    await pickAvatarIfAsked(b);
    await expect(b.getByText("What are you reading?")).toBeVisible();
    await expect(b.getByText(secret), "B must not see A's post").toHaveCount(0);

    await b.goto("/library");
    await expect(b.getByRole("heading", { name: "Your library" })).toBeVisible();
    await expect(library(b), "B must not see A's book").not.toContainText(title);
  } finally {
    // Tidy up A's post and book, pass or fail
    await a.goto("/me");
    const post = a.locator("article", { hasText: secret });
    await post.getByRole("button", { name: "Delete this post" }).click();
    await post.getByRole("button", { name: "Yes, delete" }).click();
    await expect(a.getByText(secret)).toHaveCount(0);
    await a.goto("/library");
    await library(a).getByRole("button", { name: new RegExp(`^Remove ${escape(title)}`) }).first().click();
    await expect(library(a)).not.toContainText(title);
  }
});
