"use client";

import Image from "next/image";
import { useState } from "react";
import { coverUrl, type Book } from "@/lib/books";

// A book's cover from Open Library. Many books have none, and some cover IDs
// point at nothing, so both show a plain cloth cover with the title's first
// letter instead.
export function BookCover({ book }: { book: Book }) {
  const [failed, setFailed] = useState(false);
  const box = "h-[4.5rem] w-12 shrink-0 rounded-md border border-rule";
  if (!book.coverId || failed) {
    return (
      <span aria-hidden="true" className={`${box} grid place-items-center bg-hover text-xl font-semibold italic text-accent`}>
        {book.title.trim().charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <Image
      src={coverUrl(book.coverId)}
      alt=""
      width={48}
      height={72}
      unoptimized
      onError={() => setFailed(true)}
      className={`${box} bg-hover object-cover`}
    />
  );
}

// One book in a list: cover, title, author and year, and an action on the
// right (Save, Saved or Remove).
export function BookRow({ book, children }: { book: Book; children?: React.ReactNode }) {
  const details = [book.author ?? "Unknown author", book.year].filter(Boolean).join(" · ");
  return (
    <li className="flex items-center gap-4 border-b border-rule py-4">
      <BookCover book={book} />
      <div className="min-w-0 flex-1">
        <p className="break-words text-[17px] font-semibold leading-snug">{book.title}</p>
        <p className="mt-0.5 text-[15px] text-muted">{details}</p>
      </div>
      {children}
    </li>
  );
}
