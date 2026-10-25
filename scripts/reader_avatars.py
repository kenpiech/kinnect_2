"""Draws the avatars people pick from in lib2, as SVGs in public/avatars/readers.

Same parts and style as the sample friends in avatars.py (and the same
blinking, which stops for reduce-motion), but everyday readers instead of
characters, with a range of skin tones, ages and hair. The keys must match
AVATARS in src/lib/avatars.ts and the check on profiles.avatar in the
database. Run: python3 scripts/reader_avatars.py
"""

from avatars import INK, brows, svg

OUT = __import__("avatars").OUT / "readers"

smile = f'<path d="M51 69 q9 7 18 0" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>'


def polar_bear():
    """Not a person, so not built from svg()'s parts: round ears on top, a big
    snout and nose, the same outline weight and the same blink."""
    fur, shade = "#f7f5f0", "#e6ded2"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="Cartoon of a polar bear">
<style>
.eyes{{transform-origin:60px 56px;animation:blink 5.5s infinite 2.6s}}
@keyframes blink{{0%,93%,100%{{transform:scaleY(1)}}95%{{transform:scaleY(.08)}}}}
@media (prefers-reduced-motion:reduce){{.eyes{{animation:none}}}}
</style>
<defs><clipPath id="c"><circle cx="60" cy="60" r="60"/></clipPath></defs>
<g clip-path="url(#c)" stroke-linejoin="round">
<rect width="120" height="120" fill="#cfe3ee"/>
<path d="M10 122 C12 94 34 84 60 84 C86 84 108 94 110 122 Z" fill="{fur}" stroke="{INK}" stroke-width="2.5"/>
<path d="M38 88 C48 96 72 96 82 88 L84 96 C72 106 48 106 36 96 Z" fill="#c2372e" stroke="{INK}" stroke-width="2.2"/>
<circle cx="37" cy="36" r="10" fill="{fur}" stroke="{INK}" stroke-width="2.5"/><circle cx="37" cy="36" r="5" fill="{shade}"/>
<circle cx="83" cy="36" r="10" fill="{fur}" stroke="{INK}" stroke-width="2.5"/><circle cx="83" cy="36" r="5" fill="{shade}"/>
<ellipse cx="60" cy="59" rx="29" ry="27" fill="{fur}" stroke="{INK}" stroke-width="2.5"/>
<circle cx="42" cy="66" r="4.5" fill="#e8907a" opacity=".35"/><circle cx="78" cy="66" r="4.5" fill="#e8907a" opacity=".35"/>
<g class="eyes"><ellipse cx="49" cy="55" rx="2.8" ry="3.4" fill="{INK}"/><ellipse cx="71" cy="55" rx="2.8" ry="3.4" fill="{INK}"/></g>
<ellipse cx="60" cy="70" rx="13" ry="10" fill="{shade}" stroke="{INK}" stroke-width="2.2"/>
<ellipse cx="60" cy="65.5" rx="5" ry="3.5" fill="{INK}"/>
<path d="M60 69 v3 M54 74 q6 5 12 0" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>
</g>
</svg>
"""


readers = {
    # Round glasses, side-parted dark hair, navy sweater
    "specs": svg(
        "a reader in round glasses",
        bg="#d9e4d3",
        skin="#f1c9a5",
        shirt="#2f4a6d",
        blink_delay=0.3,
        neck_extra=f'<path d="M46 87 q14 9 28 0" fill="none" stroke="{INK}" stroke-width="2.2"/>',
        eyes_extra=f'<circle cx="51" cy="58" r="7" fill="none" stroke="{INK}" stroke-width="2.2"/>'
        f'<circle cx="69" cy="58" r="7" fill="none" stroke="{INK}" stroke-width="2.2"/>'
        f'<path d="M58 57 q2 -2 4 0" fill="none" stroke="{INK}" stroke-width="2.2"/>' + brows(47),
        front=f'<path d="M37 50 C35 28 60 24 72 30 C82 34 85 42 83 50 C78 40 66 36 52 42 C46 44 40 46 37 50 Z" fill="#2a1f1a" stroke="{INK}" stroke-width="2.5"/>',
    ),
    # High bun and gold hoops, brick-red top
    "bun": svg(
        "a reader with a high bun",
        bg="#f0dcc8",
        skin="#b07850",
        shirt="#c8553d",
        blink_delay=1.9,
        back=f'<circle cx="60" cy="27" r="10" fill="#2b1a14" stroke="{INK}" stroke-width="2.5"/>',
        eyes_extra=brows(50),
        face_extra='<circle cx="37" cy="68" r="3.5" fill="none" stroke="#d8b44a" stroke-width="2"/>'
        '<circle cx="83" cy="68" r="3.5" fill="none" stroke="#d8b44a" stroke-width="2"/>',
        front=f'<path d="M38 52 C37 32 50 30 60 31 C70 30 83 32 82 52 C78 42 70 38 60 38 C50 38 42 42 38 52 Z" fill="#2b1a14" stroke="{INK}" stroke-width="2.5"/>',
        mouth=smile,
    ),
    # Big curls, coral top
    "curls": svg(
        "a reader with big curls",
        bg="#e7d6ef",
        skin="#6b4127",
        shirt="#e0735a",
        blink_delay=3.1,
        back="".join(
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="#1d1410" stroke="{INK}" stroke-width="2.5"/>'
            for x, y, r in [(40, 42, 16), (60, 31, 20), (80, 42, 16), (33, 60, 12), (87, 60, 12)]
        ),
        eyes_extra=brows(50),
        front="".join(
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="#1d1410" stroke="{INK}" stroke-width="2.2"/>'
            for x, y, r in [(47, 37, 7), (60, 34, 8), (73, 37, 7)]
        ),
        mouth=f'<path d="M50 69 q10 8 20 0 z" fill="#fff" stroke="{INK}" stroke-width="2.2"/>',
    ),
    # Red knit beanie with a pompom, mustard scarf
    "beanie": svg(
        "a reader in a beanie and scarf",
        bg="#d6e2ea",
        skin="#d9a47c",
        shirt="#4f7a5a",
        blink_delay=2.4,
        neck_extra=f'<path d="M40 86 C50 94 70 94 80 86 L82 94 C70 102 50 102 38 94 Z" fill="#e3b23c" stroke="{INK}" stroke-width="2.2"/>'
        f'<path d="M66 96 l7 22 h-9 l-3 -20 z" fill="#e3b23c" stroke="{INK}" stroke-width="2.2"/>',
        eyes_extra=brows(52),
        front=f'<path d="M36 48 C36 22 84 22 84 48 Z" fill="#b8402f" stroke="{INK}" stroke-width="2.5"/>'
        f'<rect x="34" y="43" width="52" height="9" rx="4" fill="#9c3426" stroke="{INK}" stroke-width="2.5"/>'
        f'<circle cx="60" cy="21" r="6" fill="#f3eddf" stroke="{INK}" stroke-width="2.2"/>',
        mouth=smile,
    ),
    # Bald with a full beard, green cardigan
    "beard": svg(
        "a reader with a full beard",
        bg="#efe3c2",
        skin="#8a5634",
        shirt="#55703f",
        blink_delay=0.9,
        neck_extra=f'<path d="M48 86 l12 14 l12 -14" fill="none" stroke="{INK}" stroke-width="2.2"/>',
        eyes_extra=brows(49, w=3.2),
        face_extra=f'<path d="M40 64 C40 82 50 87 60 87 C70 87 80 82 80 64 C76 74 70 76 60 76 C50 76 44 74 40 64 Z" fill="#2a1c15" stroke="{INK}" stroke-width="2.2"/>'
        '<path d="M50 38 q6 -3 12 0" fill="none" stroke="#fff" stroke-width="2" opacity=".35" stroke-linecap="round"/>',
        mouth=f'<path d="M53 70 q7 5 14 0" fill="none" stroke="#f3eddf" stroke-width="2.4" stroke-linecap="round"/>',
        cheeks=False,
    ),
    # Black bob with straight bangs, lavender top
    "bob": svg(
        "a reader with a bob and bangs",
        bg="#e6e0f2",
        skin="#efc19a",
        shirt="#7c5ca8",
        blink_delay=3.8,
        eyes_extra=brows(52),
        front=f'<path d="M36 76 C30 44 38 30 60 30 C82 30 90 44 84 76 C80 78 77 76 77 70 C79 56 78 50 76 47 C70 45 50 45 44 47 C42 50 41 56 43 70 C43 76 40 78 36 76 Z" fill="#151112" stroke="{INK}" stroke-width="2.5"/>',
        mouth=smile,
    ),
    # Teal headscarf, draped to the shoulders
    "hijab": svg(
        "a reader in a headscarf",
        bg="#f3e1c8",
        skin="#c48a62",
        shirt="#2f7f7a",
        blink_delay=1.4,
        eyes_extra=brows(50),
        front=f'<path fill-rule="evenodd" d="M60 25 C87 25 93 48 91 66 C89 80 85 88 97 100 C101 104 105 112 107 122 L13 122 C15 112 19 104 23 100 C35 88 31 80 29 66 C27 48 33 25 60 25 Z M39 58 a21 24 0 1 0 42 0 a21 24 0 1 0 -42 0 Z" fill="#2f7f7a" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M40 50 C46 40 74 40 80 50" fill="none" stroke="#24635f" stroke-width="2"/>',
        mouth=smile,
    ),
    # Silver hair and half-moon reading glasses, plum cardigan
    "silver": svg(
        "a reader with silver hair and reading glasses",
        bg="#dde3e8",
        skin="#f0cdb0",
        shirt="#8c4a5a",
        blink_delay=2.0,
        neck_extra=f'<path d="M48 86 l12 14 l12 -14" fill="#f3eddf" stroke="{INK}" stroke-width="2.2"/>'
        f'<circle cx="60" cy="106" r="1.6" fill="{INK}"/><circle cx="60" cy="114" r="1.6" fill="{INK}"/>',
        eyes_extra=f'<path d="M44 60 h14 v3 q-7 6 -14 0 z M62 60 h14 v3 q-7 6 -14 0 z" fill="none" stroke="{INK}" stroke-width="2"/>'
        f'<path d="M58 61 h4" stroke="{INK}" stroke-width="2"/>' + brows(49, color="#9a948a"),
        front=f'<path d="M36 54 C32 34 44 26 60 28 C76 26 88 34 84 54 C82 46 78 42 72 42 C68 38 52 38 48 42 C42 42 38 46 36 54 Z" fill="#cfcac2" stroke="{INK}" stroke-width="2.5"/>',
        mouth=f'<path d="M52 71 q8 5 16 0" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>',
    ),
    # Long box braids with gold beads, sunflower top
    "braids": svg(
        "a reader with long braids",
        bg="#d5e6dc",
        skin="#5c3620",
        shirt="#e8b93c",
        blink_delay=4.4,
        back=f'<path d="M26 50 q-4 30 2 56 h9 q-4 -28 2 -56 z M83 50 q4 30 -2 56 h-9 q4 -28 -2 -56 z" fill="#1b1310" stroke="{INK}" stroke-width="2.2"/>'
        '<circle cx="32" cy="104" r="2.5" fill="#d8b44a"/><circle cx="88" cy="104" r="2.5" fill="#d8b44a"/>',
        eyes_extra=brows(50),
        front=f'<path d="M37 54 C34 30 50 28 60 30 C70 28 86 30 83 54 C80 44 72 38 61 36 L60 40 L59 36 C48 38 40 44 37 54 Z" fill="#1b1310" stroke="{INK}" stroke-width="2.5"/>',
        mouth=smile,
    ),
    # Headphones over short hair, blue tee
    "headphones": svg(
        "a reader wearing headphones",
        bg="#f2d7cf",
        skin="#d6a57e",
        shirt="#3d5f8f",
        blink_delay=1.1,
        eyes_extra=brows(49),
        front=f'<path d="M38 50 C36 30 52 28 60 30 C68 28 84 30 82 50 C76 40 68 38 60 40 C52 38 44 40 38 50 Z" fill="#3a2a1e" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M33 58 C33 22 87 22 87 58" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>'
        f'<rect x="27" y="51" width="11" height="18" rx="5" fill="#e0735a" stroke="{INK}" stroke-width="2.5"/>'
        f'<rect x="82" y="51" width="11" height="18" rx="5" fill="#e0735a" stroke="{INK}" stroke-width="2.5"/>',
        mouth=smile,
    ),
    # Long red hair and freckles, green top
    "freckles": svg(
        "a reader with red hair and freckles",
        bg="#f6e3b4",
        skin="#f6d3b8",
        shirt="#3f7d6e",
        blink_delay=2.9,
        back=f'<path d="M32 82 C26 50 36 30 60 30 C84 30 94 50 88 82 C84 92 78 90 78 82 L42 82 C42 90 36 92 32 82 Z" fill="#c4602f" stroke="{INK}" stroke-width="2.5"/>',
        eyes_extra=brows(50, color="#9c4a24"),
        face_extra="".join(
            f'<circle cx="{x}" cy="{y}" r="1.1" fill="#b9774d"/>' for x, y in [(46, 63), (49, 65), (52, 63), (68, 63), (71, 65), (74, 63)]
        ),
        front=f'<path d="M37 52 C38 32 56 26 70 32 C80 36 84 44 83 52 C76 42 64 38 52 44 C46 46 40 48 37 52 Z" fill="#c4602f" stroke="{INK}" stroke-width="2.5"/>',
        mouth=smile,
    ),
    # Long golden waves with a side-swept fringe, pearl studs, rose top
    "blonde": svg(
        "a reader with long blonde hair",
        bg="#dfe6f0",
        skin="#f5d0b5",
        shirt="#d9788f",
        blink_delay=4.0,
        back=f'<path d="M30 86 C24 52 34 30 60 30 C86 30 96 52 90 86 C88 94 80 94 79 86 L41 86 C40 94 32 94 30 86 Z" fill="#e9c46a" stroke="{INK}" stroke-width="2.5"/>'
        '<path d="M34 72 q3 8 0 14 M86 72 q-3 8 0 14" fill="none" stroke="#c9a24a" stroke-width="2" stroke-linecap="round"/>',
        neck_extra=f'<path d="M47 87 q13 9 26 0" fill="none" stroke="{INK}" stroke-width="2.2"/>',
        eyes_extra=brows(50, color="#b08a3e"),
        face_extra='<circle cx="37" cy="67" r="2.2" fill="#fbf7ee" stroke="#cfc6b4" stroke-width="1"/>'
        '<circle cx="83" cy="67" r="2.2" fill="#fbf7ee" stroke="#cfc6b4" stroke-width="1"/>',
        front=f'<path d="M37 54 C36 34 50 27 64 29 C78 31 85 40 83 54 C80 46 74 40 66 38 C60 44 48 48 37 54 Z" fill="#e9c46a" stroke="{INK}" stroke-width="2.5"/>'
        '<path d="M66 38 C62 44 54 48 46 50" fill="none" stroke="#c9a24a" stroke-width="2" stroke-linecap="round"/>',
        mouth=smile,
    ),
    # Newsboy cap and a white mustache, violet sweater
    "cap": svg(
        "a reader in a newsboy cap",
        bg="#e4dccd",
        skin="#c99a74",
        shirt="#6a5a8c",
        blink_delay=3.5,
        neck_extra=f'<path d="M46 87 q14 9 28 0" fill="none" stroke="{INK}" stroke-width="2.2"/>',
        eyes_extra=brows(50, color="#d9d4cb", w=3),
        face_extra=f'<path d="M47 67 C51 63 58 64 60 66 C62 64 69 63 73 67 C69 71 63 70 60 69 C57 70 51 71 47 67 Z" fill="#ece8e0" stroke="{INK}" stroke-width="2"/>',
        mouth=f'<path d="M55 75 q5 3 10 0" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>',
        front=f'<path d="M35 47 C35 27 84 25 87 43 C91 45 92 50 85 50 C70 46 50 46 35 49 Z" fill="#7a6a55" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M33 49 C45 45 66 45 75 49 C66 55 44 55 33 51 Z" fill="#5f513f" stroke="{INK}" stroke-width="2.2"/>'
        f'<circle cx="60" cy="29" r="2.4" fill="#5f513f"/>',
    ),
    # Ninja: dark hood with only the eyes showing, red headband
    "ninja": svg(
        "a ninja",
        bg="#cfd8e3",
        skin="#e3ae86",
        shirt="#26232a",
        blink_delay=0.6,
        eyes_extra=brows(52, tilt=2, w=3),
        front=f'<path fill-rule="evenodd" d="M60 25 C87 25 91 48 89 64 C88 78 85 86 81 92 L39 92 C35 86 32 78 31 64 C29 48 33 25 60 25 Z M41 52 Q60 47 79 52 L79 63 Q60 68 41 63 Z" fill="#26232a" stroke="{INK}" stroke-width="2.5"/>'
        f'<rect x="33" y="41" width="54" height="7" rx="3" fill="#c2372e" stroke="{INK}" stroke-width="2"/>'
        f'<path d="M85 44 l15 -7 l-3 7 l13 3 l-15 4 z" fill="#c2372e" stroke="{INK}" stroke-width="2"/>',
    ),
    # Wizard: tall blue hat with stars, long white beard, blue robe
    "wizard": svg(
        "a wizard",
        bg="#e6e0f2",
        skin="#efcfb4",
        shirt="#3b4f9a",
        blink_delay=1.7,
        eyes_extra=brows(49, color="#e9e5dc", w=3.6),
        face_extra=f'<path d="M40 64 C38 92 50 106 60 108 C70 106 82 92 80 64 C76 74 70 76 60 76 C50 76 44 74 40 64 Z" fill="#f1eee8" stroke="{INK}" stroke-width="2.2"/>'
        f'<path d="M48 70 C52 65 58 66 60 68 C62 66 68 65 72 70 C68 73 63 72 60 71 C57 72 52 73 48 70 Z" fill="#f1eee8" stroke="{INK}" stroke-width="2"/>',
        mouth=f'<path d="M56 76 q4 3 8 0" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>',
        cheeks=False,
        front=f'<path d="M28 44 C40 37 80 37 92 44 C80 49 40 49 28 44 Z" fill="#26357a" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M40 43 C48 28 50 10 68 1 C62 16 72 30 80 43 Z" fill="#2f3f86" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M58 26 l1.5 3 3 .5 -2.2 2 .6 3 -2.9 -1.5 -2.9 1.5 .6 -3 -2.2 -2 3 -.5 z" fill="#e8c95a"/>'
        '<circle cx="68" cy="34" r="1.8" fill="#e8c95a"/><circle cx="62" cy="14" r="1.5" fill="#e8c95a"/>',
    ),
    # Viking: horned helmet, braided ginger beard, fur collar
    "viking": svg(
        "a viking",
        bg="#d9e2d0",
        skin="#f0c4a0",
        shirt="#7a5a3a",
        blink_delay=2.2,
        neck_extra=f'<path d="M30 96 C36 86 44 90 48 86 C52 92 58 88 60 92 C62 88 68 92 72 86 C76 90 84 86 90 96 C80 102 40 102 30 96 Z" fill="#b9a58a" stroke="{INK}" stroke-width="2.2"/>',
        eyes_extra=brows(50, color="#a8521f", w=3.4),
        face_extra=f'<path d="M40 64 C40 82 50 87 60 87 C70 87 80 82 80 64 C76 74 70 76 60 76 C50 76 44 74 40 64 Z" fill="#c8692e" stroke="{INK}" stroke-width="2.2"/>'
        f'<path d="M50 84 l-2 16 l5 0 l1 -14 Z M70 84 l2 16 l-5 0 l-1 -14 Z" fill="#c8692e" stroke="{INK}" stroke-width="2"/>'
        f'<path d="M48 70 C52 65 58 66 60 68 C62 66 68 65 72 70 C68 73 63 72 60 71 C57 72 52 73 48 70 Z" fill="#b25a24" stroke="{INK}" stroke-width="2"/>',
        mouth=f'<path d="M55 76 q5 3 10 0" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>',
        cheeks=False,
        front=f'<path d="M36 40 C24 34 18 20 25 10 C28 22 33 29 42 33 Z M84 40 C96 34 102 20 95 10 C92 22 87 29 78 33 Z" fill="#efe6cf" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M36 47 C36 25 84 25 84 47 Z" fill="#9aa3ab" stroke="{INK}" stroke-width="2.5"/>'
        f'<rect x="34" y="42" width="52" height="8" rx="3" fill="#7d868e" stroke="{INK}" stroke-width="2.2"/>'
        f'<path d="M60 28 v14" stroke="{INK}" stroke-width="2"/>'
        f'<circle cx="42" cy="46" r="1.4" fill="{INK}"/><circle cx="60" cy="46" r="1.4" fill="{INK}"/><circle cx="78" cy="46" r="1.4" fill="{INK}"/>',
    ),
    # Detective: fedora, trench coat collar, magnifying glass
    "detective": svg(
        "a detective",
        bg="#ece3cf",
        skin="#c58c64",
        shirt="#c9b28a",
        blink_delay=3.0,
        neck_extra=f'<path d="M44 86 L60 104 L50 122 L30 122 L34 98 Z M76 86 L60 104 L70 122 L90 122 L86 98 Z" fill="#b89c70" stroke="{INK}" stroke-width="2.2"/>'
        f'<path d="M54 92 l6 8 l6 -8" fill="#3a2f25" stroke="{INK}" stroke-width="1.8"/>'
        f'<circle cx="89" cy="96" r="10" fill="#cfe6ef" fill-opacity=".7" stroke="{INK}" stroke-width="3"/>'
        f'<path d="M82 103 l-10 12" stroke="#5a4a38" stroke-width="5" stroke-linecap="round"/>',
        eyes_extra=brows(50, tilt=-2, w=3),
        mouth=f'<path d="M53 70 q8 4 15 -1" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>',
        front=f'<path d="M40 43 C40 26 80 26 80 43 Z" fill="#6b5a45" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M50 30 q10 6 20 0" fill="none" stroke="#54462f" stroke-width="2"/>'
        f'<rect x="40" y="37" width="40" height="6" fill="#3a2f25"/>'
        f'<path d="M26 45 C40 38 80 38 94 45 C80 51 40 51 26 45 Z" fill="#5a4a38" stroke="{INK}" stroke-width="2.5"/>',
    ),
    # Pilot: leather flying cap with goggles up, white scarf, bomber jacket
    "pilot": svg(
        "a pilot",
        bg="#cfe0ee",
        skin="#e6b48f",
        shirt="#6b4a2e",
        blink_delay=4.6,
        neck_extra=f'<path d="M34 96 C40 88 50 90 60 90 C70 90 80 88 86 96 C78 102 42 102 34 96 Z" fill="#c9b08c" stroke="{INK}" stroke-width="2.2"/>'
        f'<path d="M44 86 C52 94 68 94 76 86 L78 92 C68 100 52 100 42 92 Z" fill="#fbf7ee" stroke="{INK}" stroke-width="2.2"/>'
        f'<path d="M66 94 l10 20 l-8 2 l-6 -18 z" fill="#fbf7ee" stroke="{INK}" stroke-width="2"/>',
        eyes_extra=brows(51),
        mouth=smile,
        front=f'<path d="M36 52 C34 28 86 28 84 52 C84 58 86 64 84 72 L79 72 C79 62 78 55 76 50 C68 45 52 45 44 50 C42 55 41 62 41 72 L36 72 C34 64 36 58 36 52 Z" fill="#7a4f2c" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M37 44 C50 40 70 40 83 44" fill="none" stroke="#3a2a1e" stroke-width="3"/>'
        f'<circle cx="51" cy="40" r="7" fill="#9fd0e6" stroke="{INK}" stroke-width="2.5"/>'
        f'<circle cx="69" cy="40" r="7" fill="#9fd0e6" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M58 40 h4" stroke="{INK}" stroke-width="2.5"/>'
        '<path d="M48 37 l3 -2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M66 37 l3 -2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>',
    ),
}

readers["polarbear"] = polar_bear()

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for key, content in readers.items():
        (OUT / f"{key}.svg").write_text(content)
    print("wrote", len(readers), "avatars to", OUT)
