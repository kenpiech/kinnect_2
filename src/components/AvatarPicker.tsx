"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { setAvatar } from "@/lib/actions";
import { AVATARS } from "@/lib/avatars";
import { Button, Toast, useToast } from "./ui";

// The avatars as one group of radio buttons, each drawn as its portrait.
// Arrow keys move between them, like any radio group.
function AvatarChoices({ value, onChange }: { value: string | null; onChange: (key: string) => void }) {
  const name = useId();
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
      {AVATARS.map((a) => (
        <label
          key={a.key}
          className={`relative grid cursor-pointer place-items-center rounded-full p-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
            value === a.key ? "ring-4 ring-accent" : "hover:ring-2 hover:ring-line"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={a.key}
            checked={value === a.key}
            onChange={() => onChange(a.key)}
            className="sr-only"
          />
          <Image src={`/avatars/readers/${a.key}.svg`} alt="" width={72} height={72} unoptimized className="size-16 rounded-full sm:size-[4.5rem]" />
          <span className="sr-only">{a.label}</span>
        </label>
      ))}
    </div>
  );
}

// Shown over every page until a new member picks an avatar. It's a modal
// <dialog>, so the page behind can't be clicked or tabbed into, and Escape
// doesn't close it: picking is required. Saving refreshes the page, and the
// layout stops rendering this once the profile has an avatar.
export function AvatarGate({ name }: { name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  async function save() {
    if (!choice) return;
    setBusy(true);
    const result = await setAvatar(choice);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="avatar-gate-title"
      onCancel={(e) => e.preventDefault()}
      className="m-auto w-[min(34rem,calc(100%-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-rule bg-paper p-6 text-ink backdrop:bg-ink/60 sm:p-8"
    >
      <h2 id="avatar-gate-title" className="text-2xl font-semibold tracking-tight">
        Welcome, {name.split(" ")[0]}. Pick your avatar
      </h2>
      <p className="mt-2 text-muted">Friends see it next to your name and your posts. You can change it later on Me.</p>
      <div className="mt-5">
        <AvatarChoices value={choice} onChange={setChoice} />
      </div>
      {error && (
        <p role="alert" className="mt-4 text-danger">
          {error}
        </p>
      )}
      <Button className="mt-6 w-full sm:w-auto" disabled={!choice || busy} onClick={save}>
        {busy ? "Saving…" : choice ? "Use this avatar" : "Pick one to continue"}
      </Button>
    </dialog>
  );
}

// On the Me page: change your avatar any time. Folded behind "Change avatar"
// (your current one is already at the top of the page), and it folds back up
// once a new one is saved. Focus returns to the button either way.
export function AvatarForm({ current }: { current: string | null }) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string | null>(current);
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();
  const toggle = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    setChoice(current);
    toggle.current?.focus();
  }

  async function save() {
    if (!choice) return;
    setBusy(true);
    const result = await setAvatar(choice);
    setBusy(false);
    showToast(result.ok ? "Avatar saved." : result.error);
    if (result.ok) {
      setOpen(false);
      toggle.current?.focus();
    }
  }

  return (
    <section aria-labelledby="avatar-heading" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="avatar-heading" className="label">
          Your avatar
        </h2>
        <Button
          ref={toggle}
          variant="secondary"
          aria-expanded={open}
          aria-controls="avatar-choices"
          onClick={() => (open ? close() : setOpen(true))}
        >
          {open ? "Cancel" : "Change avatar"}
        </Button>
      </div>
      {open && (
        <fieldset id="avatar-choices" className="grid gap-4">
          <legend className="sr-only">Pick an avatar</legend>
          <AvatarChoices value={choice} onChange={setChoice} />
          <Button className="justify-self-start" disabled={!choice || choice === current || busy} onClick={save}>
            {busy ? "Saving…" : "Save avatar"}
          </Button>
        </fieldset>
      )}
      <Toast message={toast} />
    </section>
  );
}
