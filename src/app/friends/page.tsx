"use client";

import { PersonCard } from "@/components/cards";
import { Button, ButtonLink, PageHeader, Toast, plural, useToast } from "@/components/ui";
import { personByHandle } from "@/data/people";
import { removeFriend, restoreFriend, useStore } from "@/lib/store";

// Who you've added, newest first, with Remove (and Undo in the toast). Never
// a dead end: with no friends it points you to Add.
export default function Friends() {
  const s = useStore();
  const [toast, setToast] = useToast();

  if (!s) return <p className="text-muted">Loading…</p>;

  const friends = [...s.friends].reverse().flatMap((h) => personByHandle.get(h) ?? []);

  return (
    <div className="grid gap-6">
      <PageHeader title="Friends">
        {friends.length > 0 ? `${plural(friends.length, "friend")} · newest first` : "You haven't added anyone yet."}
      </PageHeader>

      {friends.length > 0 && (
        <ul>
          {friends.map((person) => (
            <PersonCard
              key={person.handle}
              person={person}
              action={
                <Button
                  variant="secondary"
                  className="px-4"
                  aria-label={`Remove ${person.name}`}
                  onClick={() => {
                    const index = removeFriend(person.handle);
                    setToast(`Removed ${person.name}.`, {
                      label: "Undo",
                      onClick: () => {
                        restoreFriend(person.handle, index);
                        setToast(`${person.name} is back in your feed.`);
                      },
                    });
                  }}
                >
                  Remove
                </Button>
              }
            />
          ))}
        </ul>
      )}

      <ButtonLink href="/friends/add" variant={friends.length > 0 ? "secondary" : "primary"} className="justify-self-start">
        + Add a friend
      </ButtonLink>

      <Toast message={toast} />
    </div>
  );
}
