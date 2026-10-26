import { expect, test, type Locator, type Page } from "@playwright/test";
import { escape, pickAvatarIfAsked, signIn } from "./helpers";
import { READERS } from "./readers";

// Everything two friends can do together. Reader A and Reader B become
// friends; A posts about a book; B likes it, comments, saves the book from
// the post and marks it Reading; A removes B's comment (it's A's post); B
// takes the like back. Afterwards everything is deleted and they're unfriended,
// pass or fail, so the privacy test still finds two strangers.

const nameA = `${READERS.a.firstName} ${READERS.a.lastName}`;
const nameB = `${READERS.b.firstName} ${READERS.b.lastName}`;

const library = (page: Page) => page.locator('section[aria-labelledby="library-heading"]');
const results = (page: Page) => page.locator('section[aria-labelledby="search-heading"] li');

// The reply to a Server Action. They're the POSTs with a next-action header;
// Clerk also POSTs in the background, so "any POST" can be the wrong one.
const actionReply = (page: Page) => page.waitForResponse((r) => r.request().headers()["next-action"] !== undefined);

// The heart flips the moment it's tapped, before the server has saved
// anything, so wait for the Server Action's reply before reloading
async function clickAndSave(page: Page, button: Locator) {
  const saved = actionReply(page);
  await button.click();
  await saved;
}

// Remove a book from a reader's library if it's there
async function removeBook(page: Page, title: string) {
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Your library" })).toBeVisible();
  const remove = library(page).getByRole("button", { name: new RegExp(`^Remove ${escape(title)}`) });
  if (await remove.count()) {
    await remove.first().click();
    await expect(library(page)).not.toContainText(title);
  }
}

test("friends can like, comment, visit each other and save a book from a post", async ({ browser }) => {
  test.setTimeout(240_000);
  const stamp = Date.now();
  const postText = `A's post for friends ${stamp}`;
  const commentText = `B's comment ${stamp}`;
  let title = "";

  const a = await signIn(browser, READERS.a.email);
  const b = await signIn(browser, READERS.b.email);
  try {
    // A asks, B accepts
    await a.goto("/people");
    await pickAvatarIfAsked(a);
    await a.getByRole("button", { name: `Add friend ${nameB}` }).click();
    await expect(a.getByRole("region", { name: "Requests you sent" })).toContainText(nameB);

    await b.goto("/people");
    await pickAvatarIfAsked(b);
    // B's People tab counts the waiting requests, and drops by one once A's is
    // accepted. Counted from the list, since real members may also have asked
    // the test readers to be friends.
    const peopleTab = b.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /^People/ });
    const waiting = b.getByRole("region", { name: "Requests for you" }).getByRole("listitem");
    await expect(waiting.filter({ hasText: nameA })).toHaveCount(1);
    const waitingCount = await waiting.count();
    const badge = (n: number) => new RegExp(`People\\W*${n} friend requests?$`);
    await expect(peopleTab).toHaveAccessibleName(badge(waitingCount));
    await b.getByRole("button", { name: `Accept ${nameA}` }).click();
    await expect(b.getByRole("region", { name: "Friends" })).toContainText(nameA);
    if (waitingCount === 1) await expect(peopleTab).not.toHaveAccessibleName(/friend request/);
    else await expect(peopleTab).toHaveAccessibleName(badge(waitingCount - 1));

    // A saves a book and posts about it
    await a.goto("/library");
    await a.getByLabel("Search Open Library").fill("fantastic mr fox");
    await a.getByRole("button", { name: "Search", exact: true }).click();
    const first = results(a).first();
    await expect(first).toBeVisible({ timeout: 30_000 });
    title = (await first.locator("p").first().innerText()).trim();
    const save = first.getByRole("button", { name: /^Save / });
    if (await save.isVisible()) await save.click();
    await expect(library(a)).toContainText(title);

    await a.goto("/post/new");
    await a.getByLabel("What's on your mind?").fill(postText);
    // The book list starts folded away
    await a.getByRole("button", { name: /Add a book from your library/ }).click();
    await a.getByRole("radio", { name: new RegExp(escape(title)) }).check();
    await a.getByRole("button", { name: "Post about this book" }).click();
    await a.waitForURL("**/feed");

    // B sees it, saves the book from it, likes it and comments
    await b.goto("/feed");
    const bPost = b.locator("article:visible", { hasText: postText });
    await expect(bPost, "B sees a friend's post").toBeVisible();
    await bPost.getByRole("button", { name: new RegExp(`^Save book ${escape(title)}`) }).click();
    await expect(bPost.getByRole("link", { name: "In your library" })).toBeVisible();

    const like = bPost.getByRole("button", { name: /^Like/ });
    await clickAndSave(b, like);
    await expect(like).toHaveAttribute("aria-pressed", "true");
    await b.reload();
    await expect(bPost.getByText("Liked by You"), "the like was saved").toBeVisible();

    await bPost.getByRole("button", { name: /^Comment/ }).click();
    await bPost.getByLabel("Your comment").fill(commentText);
    await bPost.getByRole("button", { name: "Post comment" }).click();
    await expect(bPost.getByText(commentText)).toBeVisible();

    // A's name on the post leads to A's page, which shows the post to a friend
    await bPost.getByRole("link", { name: nameA }).click();
    await b.waitForURL(/\/people\/user_/);
    await expect(b.getByRole("heading", { name: nameA })).toBeVisible();
    await expect(b.getByText("Friends", { exact: true })).toBeVisible();
    // :visible because Next keeps the page you came from in the DOM, hidden, so
    // Back is instant; the hidden feed has the same post
    await expect(b.locator("article:visible", { hasText: postText }), "a friend's page shows their posts").toBeVisible();

    // The saved book is in B's library as Want to read; B marks it Reading
    await b.goto("/library");
    const status = library(b).getByLabel(`Reading status for ${title}`).first();
    await expect(status).toHaveValue("want");
    const statusSaved = actionReply(b);
    await status.selectOption("reading");
    await statusSaved;
    await b.reload();
    await expect(library(b).getByLabel(`Reading status for ${title}`).first(), "status was saved").toHaveValue("reading");
    await library(b).getByRole("button", { name: /^Finished/ }).click();
    await expect(library(b)).not.toContainText(title);
    await library(b).getByRole("button", { name: /^Reading/ }).click();
    await expect(library(b)).toContainText(title);

    // A sees the like and the comment, and removes the comment
    await a.goto("/feed");
    const aPost = a.locator("article:visible", { hasText: postText });
    await expect(aPost.getByText(`Liked by ${nameB}`)).toBeVisible();
    await expect(aPost.getByText(commentText)).toBeVisible();

    // A likes B's comment, and the like is saved
    await clickAndSave(a, aPost.getByRole("button", { name: new RegExp(`^Like ${escape(nameB)}'s comment`) }));
    await a.reload();
    await expect(aPost.getByRole("button", { name: new RegExp(`^Liked ${escape(nameB)}'s comment · 1`) })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await aPost.getByRole("button", { name: "Delete this comment" }).click();
    await aPost.getByRole("button", { name: "Yes, delete" }).click();
    await expect(aPost.getByText(commentText), "the author removed it").toHaveCount(0);

    // B takes the like back
    await b.goto("/feed");
    await expect(bPost.getByText(commentText)).toHaveCount(0);
    await clickAndSave(b, bPost.getByRole("button", { name: /^Liked/ }));
    await b.reload();
    await expect(bPost.getByRole("button", { name: /^Like/ })).toHaveAttribute("aria-pressed", "false");
    await expect(bPost.getByText(/Liked by/)).toHaveCount(0);
  } finally {
    // Delete the post (its likes and comments go with it) and both copies of
    // the book, then unfriend. Each page streams its list in, so wait for it
    // before counting: count() doesn't wait.
    await a.goto("/me");
    await expect(a.getByRole("heading", { name: "Your posts" })).toBeVisible();
    const mine = a.locator("article:visible", { hasText: postText });
    if (await mine.count()) {
      await mine.getByRole("button", { name: "Delete this post" }).click();
      await mine.getByRole("button", { name: "Yes, delete" }).click();
      await expect(a.getByText(postText)).toHaveCount(0);
    }
    if (title) {
      await removeBook(a, title);
      await removeBook(b, title);
    }
    await a.goto("/people");
    const friends = a.getByRole("region", { name: "Friends" });
    const sent = a.getByRole("region", { name: "Requests you sent" });
    await expect(friends).toBeVisible();
    if (await friends.getByRole("button", { name: `Remove ${nameB}` }).count()) {
      await friends.getByRole("button", { name: `Remove ${nameB}` }).click();
      await friends.getByRole("button", { name: `Yes, remove ${nameB}` }).click();
    } else if (await sent.count()) {
      await sent.getByRole("button", { name: `Cancel request to ${nameB}` }).click();
    }
    await expect(friends).not.toContainText(nameB);
  }
});
