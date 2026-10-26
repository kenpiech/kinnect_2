"use client";

import { SignOutButton } from "@clerk/nextjs";
import { useState } from "react";
import { updateDisplayName } from "@/lib/actions";
import { Button, Field, Toast, useToast } from "./ui";

// Change the name people see. Errors sit under the field and keep what
// you typed.
export function NameForm({ current }: { current: string }) {
  const [name, setName] = useState(current);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await updateDisplayName(name);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setError(undefined);
    showToast("Name saved.");
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <Field
        label="Your name"
        hint="Shown on People and on your posts."
        error={error}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (error) setError(undefined);
        }}
        autoComplete="name"
        maxLength={80}
      />
      <Button type="submit" variant="secondary" disabled={busy || name.trim() === current} className="justify-self-start">
        {busy ? "Saving…" : "Save name"}
      </Button>
      <Toast message={toast} />
    </form>
  );
}

// Sign out, in plain sight. (Clerk's account menu has it too, behind your
// avatar.)
export function SignOut() {
  return (
    <SignOutButton redirectUrl="/">
      <Button variant="secondary" className="justify-self-start">
        Sign out
      </Button>
    </SignOutButton>
  );
}
