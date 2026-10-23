"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Field, PageHeader, TextLink } from "@/components/ui";
import { MAX_POST, addPost, setDraft, setFlash, useStore } from "@/lib/store";

// The second form: write a post. A live count shows what's left. What you
// write is saved as a draft as you type, so leaving doesn't lose it. Errors
// sit under the box, say what to do, and never clear what you wrote.
export default function NewPost() {
  const router = useRouter();
  const s = useStore();
  const text = s?.draft ?? "";
  const [error, setError] = useState<string | undefined>();
  const box = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const left = MAX_POST - text.trim().length;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = addPost(text);
    if (!result.ok) {
      setError(result.error);
      box.current?.focus();
      return;
    }
    setFlash("Posted. It's at the top of your feed.");
    router.push("/feed");
  }

  return (
    <div className="grid gap-8">
      <TextLink href="/feed" className="justify-self-start text-[15px] text-muted">
        ← Back to feed
      </TextLink>

      <PageHeader title="Write a post">Short and text only. It goes at the top of your feed.</PageHeader>

      <form onSubmit={submit} noValidate className="grid gap-4">
        <Field
          ref={box}
          multiline
          label="What are you up to?"
          hint={text.trim() ? "Draft saved on this device." : undefined}
          error={error}
          value={text}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(undefined);
          }}
          placeholder="Ran my first 5K. Legs are jelly."
          autoFocus
          aside={
            <span aria-live="polite" className={`text-[14px] ${left < 0 ? "font-semibold text-danger" : "text-muted"}`}>
              {left < 0 ? `${-left} over` : `${left} left`}
            </span>
          }
        />
        <Button type="submit" className="w-full sm:w-auto sm:justify-self-start">
          Post
        </Button>
      </form>
    </div>
  );
}
