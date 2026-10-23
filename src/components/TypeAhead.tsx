"use client";

import type { Person } from "@/data/people";
import { Avatar } from "./ui";

// The suggestion list under the handle field. It follows the ARIA combobox
// pattern: the field owns it (aria-controls), the highlighted option is
// announced with aria-activedescendant, and a mouse press doesn't steal focus.
export function TypeAheadList({
  id,
  matches,
  active,
  friends,
  onPick,
}: {
  id: string;
  matches: Person[];
  active: number;
  friends: string[];
  onPick: (person: Person) => void;
}) {
  return (
    <div className="relative">
      <ul
        id={id}
        role="listbox"
        aria-label="Matching people"
        className="absolute inset-x-0 top-1 z-10 overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
      >
        {matches.map((person, i) => (
          <li
            key={person.handle}
            id={`${id}-${person.handle}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(person)}
            className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${i === active ? "bg-hover" : ""}`}
          >
            <Avatar name={person.name} handle={person.handle} />
            <span className="min-w-0 flex-1 leading-snug">
              <span className="block font-semibold">{person.name}</span>
              <span className="block text-[15px] text-muted">
                @{person.handle} · {person.role}
                {friends.includes(person.handle) && " · already your friend"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// People whose handle, name or role ("plumber") matches what's typed,
// starts-with first.
export function matchPeople(people: Person[], query: string, limit = 5) {
  const q = query.trim().replace(/^@/, "").toLowerCase();
  if (!q) return [];
  const score = (p: Person) => {
    const handle = p.handle.toLowerCase();
    const words = `${p.name} ${p.role}`.toLowerCase();
    if (handle.startsWith(q) || words.split(" ").some((w) => w.startsWith(q))) return 0;
    if (handle.includes(q) || words.includes(q)) return 1;
    return 2;
  };
  return people
    .map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s < 2)
    .sort((a, b) => a.s - b.s)
    .slice(0, limit)
    .map((x) => x.p);
}
