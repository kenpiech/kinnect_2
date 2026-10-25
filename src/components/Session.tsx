"use client";

import { useEffect, useState } from "react";
import { FAST_SPEED, isStorageOk, markSeen, setSpeed, startSession, useStore } from "@/lib/store";
import { Banner, Button } from "./ui";

const markSeenNow = () => markSeen();

// Mounted once in the layout. Starts the visit clock (first visit, last
// seen, previous visit), notes when you leave, and warns if the browser
// won't let us save. Opening any page with ?fast turns on fast-forward,
// and a bar says so while it's on.
export function Session() {
  const s = useStore();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("fast")) setSpeed(FAST_SPEED);
    startSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage can only be checked in the browser
    setBlocked(!isStorageOk());
    const onHide = () => {
      if (document.visibilityState === "hidden") markSeen();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", markSeenNow);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", markSeenNow);
    };
  }, []);

  const fast = !!s && s.clock.speed > 1;
  if (!blocked && !fast) return null;

  return (
    <div className="mb-6 grid gap-3">
      {fast && (
        <div className="flex items-center gap-3 rounded-2xl bg-ink px-4 py-2 text-[15px] text-paper">
          <p className="flex-1">
            <span className="font-semibold">Fast-forward is on.</span> A day passes every 20 seconds, for testing.
          </p>
          <Button variant="quiet" className="min-h-9 text-paper! decoration-paper/60" onClick={() => setSpeed(1)}>
            Turn off
          </Button>
        </div>
      )}
      {blocked && (
        <Banner title="This browser isn't saving lib2">
          Everything works for this visit, but your friends and posts will be gone when you close the tab. Private
          browsing often causes this.
        </Banner>
      )}
    </div>
  );
}
