"use client";

import { useState } from "react";
import { deletePost } from "@/lib/actions";
import { Button } from "./ui";

// Delete on your own posts, with a second tap to confirm, since there's no undo.
export function DeletePost({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    const result = await deletePost(id);
    setBusy(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="mt-2 -ml-2 flex flex-wrap items-center gap-1">
      {confirming ? (
        <>
          <Button variant="secondary" className="min-h-9" disabled={busy} onClick={remove}>
            {busy ? "Deleting…" : "Yes, delete"}
          </Button>
          <Button variant="quiet" className="min-h-9" disabled={busy} onClick={() => setConfirming(false)}>
            Keep
          </Button>
        </>
      ) : (
        <Button variant="quiet" className="min-h-9 text-[14px] text-muted" onClick={() => setConfirming(true)}>
          Delete<span className="sr-only"> this post</span>
        </Button>
      )}
      {error && (
        <p role="alert" className="text-[15px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
