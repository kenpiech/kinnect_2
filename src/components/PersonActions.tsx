"use client";

import { useState } from "react";
import { acceptFriendRequest, removeFriendship, sendFriendRequest, type ActionResult } from "@/lib/actions";
import type { Person } from "@/lib/data";
import { Button, Toast, useToast } from "./ui";

// The friend buttons on someone's page, the same ones People has: Add friend,
// Accept or Decline, Cancel, and Remove (which asks for a second tap). The
// actions refresh the page, so the status line and posts update by themselves.
export function PersonActions({ person }: { person: Person }) {
  const [busy, setBusy] = useState(false);
  // Remove is waiting for a second tap
  const [confirming, setConfirming] = useState(false);
  const [toast, showToast] = useToast();

  async function act(run: () => Promise<ActionResult>, done: string) {
    setBusy(true);
    const result = await run();
    setBusy(false);
    setConfirming(false);
    showToast(result.ok ? done : result.error);
  }

  const { name, userId, friendshipId, status } = person;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "none" && (
        <Button disabled={busy} onClick={() => act(() => sendFriendRequest(userId), `Asked ${name}`)}>
          {busy ? "Asking…" : "Add friend"}
        </Button>
      )}

      {status === "received" && (
        <>
          <Button disabled={busy} onClick={() => act(() => acceptFriendRequest(friendshipId!), `You and ${name} are friends`)}>
            Accept
          </Button>
          <Button variant="quiet" disabled={busy} onClick={() => act(() => removeFriendship(friendshipId!), `Declined ${name}`)}>
            Decline
          </Button>
        </>
      )}

      {status === "sent" && (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => act(() => removeFriendship(friendshipId!), `Cancelled your request to ${name}`)}
        >
          Cancel request
        </Button>
      )}

      {status === "friends" &&
        (confirming ? (
          <>
            <Button variant="secondary" disabled={busy} onClick={() => act(() => removeFriendship(friendshipId!), `Removed ${name}`)}>
              Yes, remove<span className="sr-only"> {name}</span>
            </Button>
            <Button variant="quiet" onClick={() => setConfirming(false)}>
              Keep
            </Button>
          </>
        ) : (
          <Button variant="quiet" onClick={() => setConfirming(true)}>
            Remove friend
          </Button>
        ))}

      <Toast message={toast} />
    </div>
  );
}
