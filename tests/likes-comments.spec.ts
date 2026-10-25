import { expect, test, type Locator, type Page } from "@playwright/test";
import { pickAvatarIfAsked, signIn } from "./helpers";
import { READERS } from "./readers";

// Likes and comments, end to end. Reader A and Reader B become friends, A
// posts, B likes and comments, A sees both and removes B's comment (it's A's
// post), and B takes the like back. Afterwards A deletes the post and the
// friendship, pass or fail, so the privacy test still finds two strangers.

const nameA = `${READERS.a.firstName} ${READERS.a.lastName}`;
const nameB = `${READERS.b.firstName} ${READERS.b.lastName}`;

// The heart flips the moment it's tapped, before the server has saved
// anything, so wait for the Server Action's reply before reloading
async function clickAndSave(page: Page, button: Locator) {
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/feed"));
  await button.click();
  await saved;
}

test("a friend can like and comment, and the author can remove the comment", async ({ browser }) => {
  const stamp = Date.now();
  const postText = `A's post for likes ${stamp}`;
  const commentText = `B's comment ${stamp}`;

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
    await b.getByRole("button", { name: `Accept ${nameA}` }).click();
    await expect(b.getByRole("region", { name: "Friends" })).toContainText(nameA);

    // A posts
    await a.goto("/post/new");
    await a.getByLabel("What's on your mind?").fill(postText);
    await a.getByRole("button", { name: "Post", exact: true }).click();
    await a.waitForURL("**/feed");

    // B sees it, likes it and comments
    await b.goto("/feed");
    const bPost = b.locator("article", { hasText: postText });
    await expect(bPost, "B sees a friend's post").toBeVisible();
    const like = bPost.getByRole("button", { name: /^Like/ });
    await clickAndSave(b, like);
    await expect(like).toHaveAttribute("aria-pressed", "true");
    await b.reload();
    await expect(bPost.getByText("Liked by You"), "the like was saved").toBeVisible();

    await bPost.getByRole("button", { name: /^Comment/ }).click();
    await bPost.getByLabel("Your comment").fill(commentText);
    await bPost.getByRole("button", { name: "Post comment" }).click();
    await expect(bPost.getByText(commentText)).toBeVisible();

    // A sees the like and the comment, and removes the comment
    await a.goto("/feed");
    const aPost = a.locator("article", { hasText: postText });
    await expect(aPost.getByText(`Liked by ${nameB}`)).toBeVisible();
    await expect(aPost.getByText(commentText)).toBeVisible();
    await aPost.getByRole("button", { name: "Delete this comment" }).click();
    await aPost.getByRole("button", { name: "Yes, delete" }).click();
    await expect(aPost.getByText(commentText), "the author removed it").toHaveCount(0);

    // B takes the like back
    await b.reload();
    await expect(bPost.getByText(commentText)).toHaveCount(0);
    await clickAndSave(b, bPost.getByRole("button", { name: /^Liked/ }));
    await b.reload();
    await expect(bPost.getByRole("button", { name: /^Like/ })).toHaveAttribute("aria-pressed", "false");
    await expect(bPost.getByText(/Liked by/)).toHaveCount(0);
  } finally {
    // Delete the post (its likes and comments go with it), then unfriend.
    // Each page streams its list in, so wait for it before counting: count()
    // doesn't wait, and an unloaded list would look like nothing to clean.
    await a.goto("/me");
    await expect(a.getByRole("heading", { name: "Your posts" })).toBeVisible();
    const mine = a.locator("article", { hasText: postText });
    if (await mine.count()) {
      await mine.getByRole("button", { name: "Delete this post" }).click();
      await mine.getByRole("button", { name: "Yes, delete" }).click();
      await expect(a.getByText(postText)).toHaveCount(0);
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
