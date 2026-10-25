// Three made-up posts for the signed-out landing page, by three of the sample
// characters from Assignment 3 (their portraits are in public/avatars). They
// show what Kinnect looks like before you have an account. They're labelled as
// samples on the page and never appear anywhere else.

export type SamplePost = {
  handle: string;
  name: string;
  when: string;
  text: string;
  book?: { title: string; author: string };
};

export const samplePosts: SamplePost[] = [
  {
    handle: "kant_even",
    name: "Priya Raman",
    when: "2h ago",
    text: "Reread this for seminar and it's even better the second time. The last chapter is a gut punch.",
    book: { title: "Never Let Me Go", author: "Kazuo Ishiguro" },
  },
  {
    handle: "milemarker",
    name: "Rosa Delgado",
    when: "yesterday",
    text: "Ran the lakefront path before seminar. 6 miles, one very judgmental goose. Who's in for Saturday?",
  },
  {
    handle: "dm_rolls",
    name: "Marcus Bell",
    when: "3 days ago",
    text: "Starting this with my D&D group. If anyone needs me, I'll be in the Shire.",
    book: { title: "The Hobbit", author: "J.R.R. Tolkien" },
  },
];
