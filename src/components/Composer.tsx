"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createPost } from "@/lib/actions";
import type { LibraryItem } from "@/lib/database.types";
import { MAX_POST, postLength } from "@/lib/posts";
import { setDraft, setFlash, useDraft } from "@/lib/store";
import { BookCover } from "./books";
import { Banner, Button, Field, TextLink } from "./ui";

// The Write page's form: up to 280 characters, and optionally one book from
// your library. The book list stays folded away unless you open it, or came
// from a book's "Post about it" link. What you type is kept as a draft on this device, so leaving
// doesn't lose it. Errors sit under the box and never clear what you wrote.
export function Composer({
  library,
  libraryFailed,
  initialBook,
}: {
  library: LibraryItem[];
  libraryFailed: boolean;
  initialBook: string | null;
}) {
  const router = useRouter();
  const text = useDraft();
  const [book, setBook] = useState<string | null>(initialBook);
  const [picking, setPicking] = useState(initialBook !== null);
  const [error, setError] = useState<string>();
  const [bookError, setBookError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const left = MAX_POST - postLength(text);
  const chosen = library.find((i) => i.ol_key === book);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("Write something first.");
      box.current?.focus();
      return;
    }
    if (left < 0) {
      setError(`Keep it to ${MAX_POST} characters. You're ${-left} over.`);
      box.current?.focus();
      return;
    }
    setBusy(true);
    const result = await createPost({ body: text, bookOlKey: book });
    if (!result.ok) {
      setBusy(false);
      if (result.field === "book") {
        setBookError(result.error);
        setPicking(true);
      }
      else {
        setError(result.error);
        box.current?.focus();
      }
      return;
    }
    setDraft("");
    setFlash(chosen ? `Posted about ${chosen.title}.` : "Posted. Your friends will see it in their feed.");
    router.push("/feed");
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <Field
        ref={box}
        multiline
        label="What's on your mind?"
        hint={text.trim() ? "Draft saved on this device." : undefined}
        error={error}
        value={text}
        onChange={(e) => {
          setDraft(e.target.value);
          if (error) setError(undefined);
        }}
        placeholder="Study group at 7? Halfway through a book I can't put down?"
        autoFocus={!initialBook}
        aside={
          <span aria-live="polite" className={`text-[14px] ${left < 0 ? "font-semibold text-danger" : "text-muted"}`}>
            {left < 0 ? `${-left} over` : `${left} left`}
          </span>
        }
      />

      <div className="grid gap-2">
        <button
          type="button"
          aria-expanded={picking}
          aria-controls="book-picker"
          onClick={() => setPicking((p) => !p)}
          className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-4 py-3 text-left hover:bg-hover"
        >
          <span className="min-w-0">
            {chosen ? (
              <>
                <span className="label">Book: </span>
                <span className="break-words">{chosen.title}</span>
              </>
            ) : (
              <>
                <span className="label">Add a book from your library</span>{" "}
                <span className="text-muted">(optional)</span>
              </>
            )}
          </span>
          <span aria-hidden="true" className="text-accent">
            {picking ? "▴" : "▾"}
          </span>
        </button>
        {picking && (
          <fieldset id="book-picker" className="grid gap-2">
            <legend className="sr-only">Book for this post</legend>
            {libraryFailed ? (
              <p className="text-muted">Couldn&apos;t load your library just now, so this post can go without a book.</p>
            ) : library.length === 0 ? (
              <p className="text-muted">
                Your library is empty. <TextLink href="/library">Save a book</TextLink> to mention it in a post.
              </p>
            ) : (
              <div className="grid max-h-96 gap-2 overflow-y-auto rounded-2xl border border-rule bg-surface p-3">
                <BookChoice checked={book === null} onChange={() => setBook(null)}>
                  <span className="text-[17px]">No book</span>
                </BookChoice>
                {library.map((item) => (
                  <BookChoice key={item.id} checked={book === item.ol_key} onChange={() => setBook(item.ol_key)}>
                    <BookCover
                      book={{ olKey: item.ol_key, title: item.title, author: item.author, coverId: item.cover_id, year: item.year }}
                    />
                    <span className="min-w-0">
                      <span className="block break-words font-semibold leading-snug">{item.title}</span>
                      <span className="block text-[15px] text-muted">{item.author ?? "Unknown author"}</span>
                    </span>
                  </BookChoice>
                ))}
              </div>
            )}
          </fieldset>
        )}
        {bookError && (
          <Banner tone="accent" title="About that book">
            {bookError}
          </Banner>
        )}
      </div>

      <Button type="submit" disabled={busy} className="w-full sm:w-auto sm:justify-self-start">
        {busy ? "Posting…" : chosen ? "Post about this book" : "Post"}
      </Button>
    </form>
  );
}

// One radio choice in the book list. The whole row is the label, so it's an
// easy tap target.
function BookChoice({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center gap-4 rounded-xl px-3 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${
        checked ? "bg-hover ring-2 ring-accent" : "hover:bg-hover"
      }`}
    >
      <input type="radio" name="book" checked={checked} onChange={onChange} className="size-5 shrink-0 accent-accent" />
      {children}
    </label>
  );
}
