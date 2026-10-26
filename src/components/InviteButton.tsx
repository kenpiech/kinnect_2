"use client";

import { useState } from "react";
import { Button, Field, Toast, useToast } from "./ui";

// "Invite a friend": opens the phone's share sheet with kinnect's link,
// or copies the link where there's no share sheet (most desktop browsers).
// If the browser blocks both, it shows the link so they can copy it by hand.
export function InviteButton({ className = "" }: { className?: string }) {
  const [toast, showToast] = useToast();
  // The link, shown only when sharing and copying both failed
  const [manual, setManual] = useState<string | null>(null);

  async function invite() {
    const url = window.location.origin;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "kinnect",
          text: "Join me on kinnect, a small social network for friends.",
          url,
        });
        return;
      } catch (error) {
        // They closed the share sheet, which is fine
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Anything else (say, sharing isn't allowed here): try copying instead
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setManual(null);
      showToast("Link copied. Send it to a friend.");
    } catch {
      setManual(url);
    }
  }

  return (
    <div className={`grid gap-3 ${className}`}>
      <Button variant="secondary" onClick={invite} className="justify-self-start">
        Invite a friend
      </Button>
      {manual && (
        <Field
          label="Copy this link and send it to a friend"
          readOnly
          value={manual}
          // Select it all on focus, so it's one step to copy on a phone
          onFocus={(e) => e.currentTarget.select()}
        />
      )}
      <Toast message={toast} />
    </div>
  );
}
