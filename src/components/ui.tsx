"use client";

import Image from "next/image";
import Link from "next/link";
import { forwardRef, useCallback, useEffect, useId, useState } from "react";

// Shared building blocks. Every page uses these instead of styling its own
// buttons, fields or notices, so kinnect looks and behaves the same everywhere.

type Variant = "primary" | "secondary" | "quiet";

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-[15px] font-semibold cursor-pointer transition-colors border disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-ink disabled:border-disabled";

const buttonVariants: Record<Variant, string> = {
  primary: "bg-accent text-paper border-accent hover:bg-accent-hover hover:border-accent-hover active:bg-accent-pressed",
  secondary: "bg-surface text-ink border-line hover:bg-hover active:bg-hover",
  quiet: "bg-transparent text-ink border-transparent underline decoration-line underline-offset-4 hover:decoration-ink px-2",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: React.ComponentProps<"button"> & { variant?: Variant }) {
  return <button type={type} className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props} />;
}

export function TextLink({ className = "", ...props }: React.ComponentProps<typeof Link>) {
  return <Link className={`underline underline-offset-4 hover:decoration-2 ${className}`} {...props} />;
}

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  // Shown at the right of the label row, e.g. a character count
  aside?: React.ReactNode;
  // Shown right under the control, e.g. type-ahead suggestions
  below?: React.ReactNode;
};

// A labelled input or textarea. The error sits right under the field, is
// announced to screen readers, and never clears what the person typed.
export const Field = forwardRef<
  HTMLInputElement & HTMLTextAreaElement,
  FieldProps &
    (
      | ({ multiline?: false } & React.InputHTMLAttributes<HTMLInputElement>)
      | ({ multiline: true } & React.TextareaHTMLAttributes<HTMLTextAreaElement>)
    )
>(function Field({ label, hint, error, aside, below, multiline, className = "", ...props }, ref) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const control = `w-full rounded-xl bg-surface text-ink border px-4 text-[17px] placeholder:text-muted hover:bg-hover focus-visible:bg-surface ${
    error ? "border-danger border-2" : "border-line"
  } ${className}`;

  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="label">
          {label}
        </label>
        {aside}
      </div>
      {multiline ? (
        <textarea
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${control} min-h-36 py-3 leading-relaxed`}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${control} min-h-11`}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {below}
      {error && (
        <p id={errorId} className="flex items-start gap-2 text-[15px] font-semibold text-danger">
          <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-danger text-xs text-paper">!</span>
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-[15px] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
});

// A boxed notice at the top of a page: welcome back, storage blocked, and so on.
export function Banner({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "accent";
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={`rounded-2xl border p-4 ${tone === "accent" ? "border-accent/40 border-l-4 border-l-accent" : "border-rule"} bg-surface`}
    >
      <p className="font-bold">{title}</p>
      {children && <div className="mt-1 text-muted">{children}</div>}
    </section>
  );
}

// A short confirmation after an action ("Added Rosa"), with an optional
// action like Undo. It sits just above the bottom tabs (or the bottom of the
// screen on wider ones), away from the page heading, in a polite live region
// so screen readers announce it without moving focus. It fades after a few
// seconds; a toast with an action stays a little longer.
export type ToastMessage = { text: string; action?: { label: string; onClick: () => void } };

export function Toast({ message, raised }: { message: ToastMessage | null; raised?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4 ${
        raised ? "bottom-[calc(8rem+env(safe-area-inset-bottom))]" : "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
      } sm:bottom-6`}
    >
      {message && (
        <p className="pointer-events-auto flex items-center gap-4 rounded-full bg-ink py-2.5 pr-3 pl-5 text-[15px] text-paper shadow-lg">
          {message.text}
          {message.action && (
            <button
              type="button"
              onClick={message.action.onClick}
              className="min-h-8 cursor-pointer rounded-full px-3 font-semibold underline underline-offset-4 hover:bg-paper/15"
            >
              {message.action.label}
            </button>
          )}
        </p>
      )}
    </div>
  );
}

export function useToast() {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), message.action ? 7000 : 4000);
    return () => clearTimeout(t);
  }, [message]);
  // A new object each time, so the same message twice still shows
  const show = useCallback(
    (text: string, action?: ToastMessage["action"]) => setMessage({ text, action }),
    [],
  );
  const hide = useCallback(() => setMessage(null), []);
  return [message, show, hide] as const;
}

// Lives in src/lib/format.ts so server components can call it too
export { plural } from "@/lib/format";

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="grid gap-1">
      <h1 tabIndex={-1} className="text-3xl font-semibold tracking-tight outline-offset-4 sm:text-4xl">
        {title}
      </h1>
      {children && <div className="text-muted">{children}</div>}
    </header>
  );
}

// A cartoon portrait: the one a person picked (public/avatars/readers, drawn
// by scripts/reader_avatars.py), or a sample friend's on the landing page
// (public/avatars, by scripts/avatars.py). Initials until someone has picked.
// Marks one of kinnect's labelled bots wherever their name appears, so nobody
// mistakes them for a real person. Plain text, so screen readers say "Bot" too.
export function BotTag() {
  return (
    <span className="inline-flex items-center rounded-full border border-line px-2 text-[13px] font-semibold leading-5 text-muted">
      Bot
    </span>
  );
}

export function Avatar({
  name,
  avatar,
  handle,
  size = "md",
}: {
  name: string;
  avatar?: string | null;
  handle?: string;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "lg" ? "size-16" : size === "sm" ? "size-9" : "size-12";
  const src = avatar ? `/avatars/readers/${avatar}.svg` : handle ? `/avatars/${handle}.svg` : null;
  if (src) {
    return <Image src={src} alt="" width={64} height={64} unoptimized className={`${box} shrink-0 rounded-full`} />;
  }
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`${box} grid shrink-0 place-items-center rounded-full bg-ink font-bold text-paper ${size === "lg" ? "text-lg" : size === "sm" ? "text-xs" : "text-sm"}`}
    >
      {initials}
    </span>
  );
}
