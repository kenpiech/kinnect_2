<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Kinnect

A text-only social app: add people as friends and read what they post. Spelled with two n's.

## Product facts
- **No backend.** There's no database, no accounts and no external APIs. All data lives in the browser's localStorage.
- **Simulated network.** The friends are seeded sample people (`src/data/people.ts`). Each post has a `dayOffset` and an `hour`, and it goes live at `firstVisit + dayOffset days + hour`, so coming back on a later day shows new posts. The UI says these are sample friends saved on this device.
- **One storage module.** Only `src/lib/store.ts` touches localStorage, under one versioned key (`kinnect:v1`). Keep it that way, so a real database can replace it later.
- **Mobile first.** Design for a phone first: tabs in a bottom bar, tap targets of at least 44px, one column. Wider screens get the same column, with the tabs moved into the top bar.
- **Text-only posts.** Posts have no images for now. The sample friends have cartoon SVG avatars in `public/avatars/`, drawn by `scripts/avatars.py`. Change the script and rerun it; don't hand-edit the SVGs.
- **Style.** Bookish, like an e-reader or bone-coloured paper: Literata (serif), warm paper `#f3eddf`, soft black ink, hairline rules, rounded pill buttons, and one oxblood accent like a bookmark ribbon. Approachable rather than techie: sentence case, no all-caps labels. Tokens live in `src/app/globals.css`. Use the shared components in `src/components/`; don't restyle one-off elements.
- **Forms.** One column. Every field has a real `<label>`. Errors sit under the field (linked with `aria-describedby`) and say what to do next, and the typed value is never cleared on error.
- **Accessibility.** Everything works with a keyboard, and focus is always visible.
- **Dependencies.** Don't add packages beyond what create-next-app installed unless the user agrees.
