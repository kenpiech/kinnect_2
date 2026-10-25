"use client";

import { useState } from "react";
import { acceptFriendRequest, removeFriendship, sendFriendRequest, type ActionResult } from "@/lib/actions";
import type { Person } from "@/lib/data";
import { Avatar, Button, Field, Toast, plural, useToast } from "./ui";

// The People tab: everyone on Kinnect, grouped by how they're connected to
// you. Requests for you come first, since they're waiting on you. A request
// only counts once the other person accepts; until then neither of you sees
// the other's posts. Remove covers decline, cancel and unfriend.
export function People({ people }: { people: Person[] }) {
  const [filter, setFilter] = useState("");
  // People with an action in flight, by user ID
  const [busy, setBusy] = useState<Set<string>>(() => new Set());
  // The friend whose Remove is waiting for a second tap
  const [confirming, setConfirming] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  const received = people.filter((p) => p.status === "received");
  const friends = people.filter((p) => p.status === "friends");
  const sent = people.filter((p) => p.status === "sent");
  const others = people.filter((p) => p.status === "none");
  const needle = filter.trim().toLowerCase();
  const shown = needle ? others.filter((p) => p.name.toLowerCase().includes(needle)) : others;

  async function act(person: Person, run: () => Promise<ActionResult>, done: string) {
    setBusy((s) => new Set(s).add(person.userId));
    const result = await run();
    setBusy((s) => {
      const next = new Set(s);
      next.delete(person.userId);
      return next;
    });
    setConfirming(null);
    showToast(result.ok ? done : result.error);
  }

  const request = (p: Person) => act(p, () => sendFriendRequest(p.userId), `Asked ${p.name}`);
  const accept = (p: Person) => act(p, () => acceptFriendRequest(p.friendshipId!), `You and ${p.name} are friends`);
  const remove = (p: Person, done: string) => act(p, () => removeFriendship(p.friendshipId!), done);

  if (people.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-5">
        <p className="font-bold">You&apos;re the first one here</p>
        <p className="mt-1 text-muted">
          Send a classmate the link to Kinnect. Once they sign up, they&apos;ll show up here and you can add each other.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-10">
      {received.length > 0 && (
        <Group title="Requests for you" note="Accept to see each other's posts.">
          {received.map((p) => (
            <PersonRow key={p.userId} person={p}>
              <Button disabled={busy.has(p.userId)} onClick={() => accept(p)}>
                Accept<span className="sr-only"> {p.name}</span>
              </Button>
              <Button variant="quiet" disabled={busy.has(p.userId)} onClick={() => remove(p, `Declined ${p.name}`)}>
                Decline<span className="sr-only"> {p.name}</span>
              </Button>
            </PersonRow>
          ))}
        </Group>
      )}

      <Group
        title="Friends"
        aside={friends.length > 0 ? plural(friends.length, "friend") : undefined}
        note={friends.length > 0 ? "You see each other's posts. Your libraries stay private." : undefined}
      >
        {friends.length === 0 ? (
          <p className="text-muted">No friends yet. Ask someone below, and once they accept, you&apos;ll see each other&apos;s posts.</p>
        ) : (
          friends.map((p) => (
            <PersonRow key={p.userId} person={p}>
              {confirming === p.userId ? (
                <>
                  <Button variant="secondary" disabled={busy.has(p.userId)} onClick={() => remove(p, `Removed ${p.name}`)}>
                    Yes, remove<span className="sr-only"> {p.name}</span>
                  </Button>
                  <Button variant="quiet" onClick={() => setConfirming(null)}>
                    Keep
                  </Button>
                </>
              ) : (
                <Button variant="quiet" onClick={() => setConfirming(p.userId)}>
                  Remove<span className="sr-only"> {p.name}</span>
                </Button>
              )}
            </PersonRow>
          ))
        )}
      </Group>

      {sent.length > 0 && (
        <Group title="Requests you sent" note="Waiting for them to accept.">
          {sent.map((p) => (
            <PersonRow key={p.userId} person={p}>
              <Button variant="quiet" disabled={busy.has(p.userId)} onClick={() => remove(p, `Cancelled your request to ${p.name}`)}>
                Cancel<span className="sr-only"> request to {p.name}</span>
              </Button>
            </PersonRow>
          ))}
        </Group>
      )}

      {others.length > 0 && (
        <Group title="People you may know" aside={plural(others.length, "person")}>
          {others.length > 5 && (
            <div className="mb-2">
              <Field
                label="Find someone"
                type="search"
                autoComplete="off"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          )}
          {shown.length === 0 ? (
            <p className="text-muted">No one by that name. Check the spelling, or try just a first name.</p>
          ) : (
            shown.map((p) => (
              <PersonRow key={p.userId} person={p}>
                <Button variant="secondary" disabled={busy.has(p.userId)} onClick={() => request(p)}>
                  {busy.has(p.userId) ? "Asking…" : "Add friend"}
                  <span className="sr-only"> {p.name}</span>
                </Button>
              </PersonRow>
            ))
          )}
        </Group>
      )}

      <Toast message={toast} />
    </div>
  );
}

function Group({
  title,
  aside,
  note,
  children,
}: {
  title: string;
  aside?: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="grid gap-1">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {aside && <p className="text-[15px] text-muted">{aside}</p>}
      </div>
      {note && <p className="text-[15px] text-muted">{note}</p>}
      <ul className="mt-1">{children}</ul>
    </section>
  );
}

function PersonRow({ person, children }: { person: Person; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule py-4">
      <Avatar name={person.name} />
      <p className="min-w-0 flex-1 break-words text-[17px] font-semibold">{person.name}</p>
      <div className="flex items-center gap-1">{children}</div>
    </li>
  );
}
