// Plain helpers with no "use client", so server components can call them too.
// (A function exported from a "use client" file can only be called in the
// browser; calling it while rendering on the server crashes the page.)

export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
