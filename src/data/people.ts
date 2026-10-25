// The sample network. lib2 has no server yet, so these seven people and
// their posts ship with the app. Each post goes live `dayOffset` days after
// your first visit, at `hour` o'clock-ish (see visibleAt in lib/store.ts),
// so there's something new when you come back. Day 0 posts are already up
// when you arrive.

export type Person = {
  handle: string;
  name: string;
  role: string;
  bio: string;
};

export type SeedPost = {
  id: string;
  author: string;
  text: string;
  dayOffset: number;
  hour: number;
};

export const people: Person[] = [
  {
    handle: "bunkerbill",
    name: "Bill Hargrove",
    role: "Prepper",
    bio: "Prepared, not paranoid. 400 days of rice and counting.",
  },
  {
    handle: "tj_linebacker",
    name: "TJ Okafor",
    role: "Linebacker",
    bio: "Middle linebacker. Six meals a day. Mama's boy.",
  },
  {
    handle: "milemarker",
    name: "Rosa Delgado",
    role: "Runner",
    bio: "Marathoner. Up before the sun, asleep before the news.",
  },
  {
    handle: "kant_even",
    name: "Priya Raman",
    role: "Philosophy PhD",
    bio: "Year five of a philosophy PhD. Thinking about thinking, mostly about deadlines.",
  },
  {
    handle: "pipedreams",
    name: "Gus Petrakis",
    role: "Plumber",
    bio: "Licensed plumber, 22 years. Please stop pouring grease down the drain.",
  },
  {
    handle: "homefronthannah",
    name: "Hannah Whitfield",
    role: "Homemaker",
    bio: "Mom of three, sourdough starter of one. Running this house like a ship.",
  },
  {
    handle: "dm_rolls",
    name: "Marcus Bell",
    role: "Dungeon Master",
    bio: "Dungeon Master, Thursday nights. Your choices have consequences.",
  },
];

type Draft = Omit<SeedPost, "id" | "author">;

const drafts: Record<string, Draft[]> = {
  bunkerbill: [
    { dayOffset: 0, hour: 6, text: "Rotated the canned goods this morning. If it's dated before 2027 it's going in tonight's chili. Waste not." },
    { dayOffset: 0, hour: 19, text: "Asked @pipedreams how long a 55-gallon drum of water stays good. He said 'Bill, it's Tuesday.' Not an answer, Gus." },
    { dayOffset: 1, hour: 7, text: "Hand-crank radio test: passed. Picked up a farm report and one very confident preacher." },
    { dayOffset: 2, hour: 20, text: "Power flickered for four seconds tonight. The family did not appreciate the drill I ran afterward." },
    { dayOffset: 4, hour: 9, text: "Learned to make candles from leftover bacon grease. The house smells like breakfast forever now. Worth it." },
    { dayOffset: 6, hour: 18, text: "@kant_even says preparing for every possible future means living in none of them. I say she's never been without toilet paper." },
    { dayOffset: 8, hour: 8, text: "Garden update: the potatoes are winning. The tomatoes have lost the will to live." },
    { dayOffset: 10, hour: 21, text: "Go-bag is down to 22 pounds. Took out the second can opener. Feels reckless." },
    { dayOffset: 13, hour: 12, text: "Two weeks of posting on here and the world hasn't ended. Starting to think you people are a good influence." },
  ],
  tj_linebacker: [
    { dayOffset: 0, hour: 8, text: "Film session at 6am. Coach paused on my missed tackle for a full minute. Silence. Pain." },
    { dayOffset: 0, hour: 20, text: "Meal four of six: a whole rotisserie chicken and a sweet potato the size of a football. Fitting." },
    { dayOffset: 1, hour: 17, text: "Ran stadium stairs with @milemarker. She lapped me twice and wasn't even breathing hard. Humbling." },
    { dayOffset: 3, hour: 21, text: "WIN. 11 tackles, one forced fumble. Mama was in the stands with a sign bigger than she is." },
    { dayOffset: 5, hour: 10, text: "Ice bath, then a nap, then a second ice bath. Recovery is a full-time job." },
    { dayOffset: 7, hour: 16, text: "Visited @homefronthannah's son's peewee practice. Those kids hit harder than some of my teammates." },
    { dayOffset: 9, hour: 19, text: "Tried yoga for flexibility. The instructor said 'just relax into it.' Ma'am, I am 245 pounds." },
    { dayOffset: 11, hour: 22, text: "Away game this weekend. Packing three protein shakers and zero sense of direction." },
    { dayOffset: 13, hour: 9, text: "Coach said my footwork is 'finally acceptable.' Framing that quote." },
  ],
  milemarker: [
    { dayOffset: 0, hour: 5, text: "18 miles before sunrise. Saw two deer, one owl, and a guy in a bathrobe walking a cat." },
    { dayOffset: 0, hour: 15, text: "Marathon is 5 weeks out. Taper starts in 2. My legs are already writing angry letters." },
    { dayOffset: 1, hour: 6, text: "Easy 5 today. 'Easy' is a feeling, not a pace." },
    { dayOffset: 2, hour: 12, text: "New shoes. Same feet. Somehow I expected otherwise." },
    { dayOffset: 4, hour: 5, text: "Rain run. Everyone else stayed in. The trails were all mine and so were the puddles." },
    { dayOffset: 5, hour: 18, text: "@tj_linebacker wants to run a 5K with me. I told him to bring snacks. He brought a rotisserie chicken." },
    { dayOffset: 7, hour: 7, text: "Speedwork: 8 × 800m. Lungs left the chat around repeat six." },
    { dayOffset: 10, hour: 6, text: "Longest run of the cycle: 22 miles. Ate a gel that tasted like a scented candle." },
    { dayOffset: 12, hour: 20, text: "Bib number came in the mail. 4417. Already decided it's lucky." },
  ],
  kant_even: [
    { dayOffset: 0, hour: 10, text: "Chapter 3 draft is due Friday. Chapter 3 currently consists of a title and a footnote apologizing for the title." },
    { dayOffset: 0, hour: 23, text: "If a grad student writes in the library and no one reads the paper, was it peer reviewed?" },
    { dayOffset: 1, hour: 14, text: "Taught a 9am section on free will. Half the room chose not to attend. Point made." },
    { dayOffset: 2, hour: 22, text: "Thursday D&D with @dm_rolls. My wizard spent 40 minutes debating a door's moral status. Party left without me." },
    { dayOffset: 4, hour: 11, text: "My advisor said my argument is 'interesting.' In academia that's either praise or a threat." },
    { dayOffset: 6, hour: 13, text: "@bunkerbill asked me what I'd grab first in an emergency. Honestly? My dissertation backup drive. Then the cat." },
    { dayOffset: 8, hour: 21, text: "Wrote 2,000 words today. Deleted 1,800. Progress is a social construct." },
    { dayOffset: 11, hour: 15, text: "Chapter 3: submitted. I am a free woman for exactly one week." },
    { dayOffset: 13, hour: 10, text: "Reading Montaigne in the park. He also wrote about nothing in particular and got famous for it. There's hope." },
  ],
  pipedreams: [
    { dayOffset: 0, hour: 7, text: "Pulled a whole action figure out of a toilet this morning. Batman. He'd been down there a while." },
    { dayOffset: 0, hour: 17, text: "PSA: the 'flushable' wipes are not flushable. I have seen things." },
    { dayOffset: 1, hour: 12, text: "Fixed @homefronthannah's kitchen sink. Got paid in banana bread. Best rate I charge all year." },
    { dayOffset: 3, hour: 8, text: "Water heater install, 7am. Customer had coffee and muffins waiting. Best 7am of my month." },
    { dayOffset: 5, hour: 19, text: "Teaching my nephew to sweat copper pipe. He's a natural. Didn't burn anything except my patience." },
    { dayOffset: 6, hour: 9, text: "@bunkerbill wants a rainwater catchment system. I said sure. He wants it 'off the books.' It's a gutter, Bill." },
    { dayOffset: 9, hour: 16, text: "Cold snap coming. Wrap your outdoor pipes, people. I'd rather not meet you at 2am." },
    { dayOffset: 11, hour: 7, text: "Called a 'small leak.' Basement was a swimming pool. Small leaks are never small." },
    { dayOffset: 13, hour: 18, text: "Twenty-two years and I still get a kick out of a clean solder joint. Find work you like, folks." },
  ],
  homefronthannah: [
    { dayOffset: 0, hour: 9, text: "Sourdough starter is 3 years old today. She's more reliable than the dishwasher. Happy birthday, Doughlores." },
    { dayOffset: 0, hour: 16, text: "Carpool, piano, peewee football, and a science fair volcano, all before dinner. Running this house like a ship." },
    { dayOffset: 1, hour: 20, text: "Gus (@pipedreams) fixed the sink. Paid him in banana bread. Bartering is back and I'm thriving." },
    { dayOffset: 2, hour: 7, text: "Packed three lunches, found two shoes, lost one child for four minutes (he was in the laundry basket). Normal Tuesday." },
    { dayOffset: 4, hour: 14, text: "Meal-prepped 21 freezer dinners. @bunkerbill asked if I'm preparing for the apocalypse. No, Bill. Thursdays." },
    { dayOffset: 7, hour: 18, text: "TJ from the college team came to peewee practice. My son hasn't stopped talking about it. Neither have I, honestly." },
    { dayOffset: 9, hour: 10, text: "Reorganized the pantry by color. My husband can't find anything. I call that a feature." },
    { dayOffset: 11, hour: 21, text: "Kids asleep. House quiet. Eating the last slice of banana bread in the dark like a raccoon." },
    { dayOffset: 13, hour: 8, text: "Science fair update: the volcano won second place. The baking soda budget won first." },
  ],
  dm_rolls: [
    { dayOffset: 0, hour: 11, text: "Session 47 prep: 12 pages of notes. The party will ignore all of it and befriend a goat." },
    { dayOffset: 0, hour: 22, text: "Rolled a natural 20 on behalf of the dragon. Felt bad. Did not reroll." },
    { dayOffset: 1, hour: 19, text: "New rule at my table: if you argue with the rulebook, you have to read the rulebook out loud. Silence fell." },
    { dayOffset: 3, hour: 23, text: "@kant_even's wizard just convinced a lich that death is a social construct. I need a minute." },
    { dayOffset: 5, hour: 12, text: "Painted 14 goblin miniatures over lunch. They'll die in one fireball. That's the circle of life." },
    { dayOffset: 7, hour: 22, text: "The party finally met the goat again. They made him mayor. I'm rewriting the whole campaign." },
    { dayOffset: 8, hour: 17, text: "Asked @bunkerbill to play a session. He brought his own 72-hour kit to the table. Respect." },
    { dayOffset: 10, hour: 20, text: "Session 48: zero combat, three hours of bargaining at a cheese market. Best session yet." },
    { dayOffset: 12, hour: 22, text: "Mayor Goat has passed his first law. It's about cheese. Of course it's about cheese." },
  ],
};

export const seedPosts: SeedPost[] = Object.entries(drafts).flatMap(([author, posts]) =>
  posts.map((p, i) => ({ ...p, author, id: `${author}-${i}` })),
);

export const personByHandle = new Map(people.map((p) => [p.handle, p]));
