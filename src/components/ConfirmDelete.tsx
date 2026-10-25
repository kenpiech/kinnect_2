"use client";

import { useState } from "react";
import type { ActionResult } from "@/lib/actions";
import { Button } from "./ui";

// Delete for a post or a comment, with a second tap to confirm, since there's
// no undo. `what` finishes the screen-reader label ("Delete this post").
export function ConfirmDelete({ what, remove }: { what: string; remove: () => Promise<ActionResult> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    const result = await remove();
    setBusy(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <span className="flex flex-wrap items-center gap-1">
      {confirming ? (
        <>
          <Button variant="secondary" className="min-h-9" disabled={busy} onClick={confirm}>
            {busy ? "Deleting…" : "Yes, delete"}
          </Button>
          <Button variant="quiet" className="min-h-9" disabled={busy} onClick={() => setConfirming(false)}>
            Keep
          </Button>
        </>
      ) : (
        <Button variant="quiet" className="min-h-9 text-[14px] text-muted" onClick={() => setConfirming(true)}>
          Delete<span className="sr-only"> {what}</span>
        </Button>
      )}
      {error && (
        <span role="alert" className="text-[15px] text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
