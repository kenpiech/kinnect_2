// The 13 avatars people pick from, drawn by scripts/reader_avatars.py into
// public/avatars/readers. The keys must match the check on profiles.avatar.
export const AVATARS = [
  { key: "specs", label: "Round glasses" },
  { key: "bun", label: "High bun" },
  { key: "curls", label: "Big curls" },
  { key: "beanie", label: "Beanie and scarf" },
  { key: "beard", label: "Full beard" },
  { key: "bob", label: "Bob and bangs" },
  { key: "hijab", label: "Headscarf" },
  { key: "silver", label: "Silver hair" },
  { key: "braids", label: "Long braids" },
  { key: "headphones", label: "Headphones" },
  { key: "freckles", label: "Red hair and freckles" },
  { key: "blonde", label: "Long blonde hair" },
  { key: "cap", label: "Newsboy cap" },
] as const;

export function isAvatar(value: unknown): value is (typeof AVATARS)[number]["key"] {
  return AVATARS.some((a) => a.key === value);
}
