// Shared by the Write page (live count) and createPost (the real check).
export const MAX_POST = 280;

// Counts characters the way Postgres's char_length does, so an emoji is one,
// not the two UTF-16 units that .length would count.
export function postLength(text: string) {
  return [...text.trim()].length;
}

// "3m ago", "yesterday", "4 days ago"
export function timeAgo(at: number, now: number) {
  const mins = Math.round((now - at) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
