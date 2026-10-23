"""Draws the sample friends' cartoon avatars as SVGs in public/avatars.

Each portrait is built from the same parts (shoulders, neck, ears, head,
eyes, brows, nose, mouth) plus a few props that say who they are. The eyes
blink every few seconds, staggered per person, and stop for anyone who has
reduce-motion turned on. Run: python3 scripts/avatars.py
"""

from pathlib import Path

INK = "#2b2620"
OUT = Path(__file__).resolve().parent.parent / "public" / "avatars"


def svg(name, bg, skin, shirt, back="", front="", eyes_extra="", mouth=None, blink_delay=0.0, cheeks=True, neck_extra="", face_extra=""):
    mouth = mouth or f'<path d="M52 69 q8 6 16 0" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>'
    cheek = (
        '<circle cx="45" cy="66" r="4.5" fill="#e8907a" opacity=".35"/>'
        '<circle cx="75" cy="66" r="4.5" fill="#e8907a" opacity=".35"/>'
        if cheeks
        else ""
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="Cartoon of {name}">
<style>
.eyes{{transform-origin:60px 58px;animation:blink 5.5s infinite {blink_delay}s}}
@keyframes blink{{0%,93%,100%{{transform:scaleY(1)}}95%{{transform:scaleY(.08)}}}}
@media (prefers-reduced-motion:reduce){{.eyes{{animation:none}}}}
</style>
<defs><clipPath id="c"><circle cx="60" cy="60" r="60"/></clipPath></defs>
<g clip-path="url(#c)" stroke-linejoin="round">
<rect width="120" height="120" fill="{bg}"/>
{back}
<path d="M12 122 C14 96 36 86 60 86 C84 86 106 96 108 122 Z" fill="{shirt}" stroke="{INK}" stroke-width="2.5"/>
<path d="M51 72 h18 v15 c-5 5 -13 5 -18 0 z" fill="{skin}" stroke="{INK}" stroke-width="2.5"/>
{neck_extra}
<circle cx="38" cy="59" r="5.5" fill="{skin}" stroke="{INK}" stroke-width="2.5"/>
<circle cx="82" cy="59" r="5.5" fill="{skin}" stroke="{INK}" stroke-width="2.5"/>
<ellipse cx="60" cy="57" rx="22" ry="25" fill="{skin}" stroke="{INK}" stroke-width="2.5"/>
{cheek}
<g class="eyes"><ellipse cx="51" cy="58" rx="2.6" ry="3.3" fill="{INK}"/><ellipse cx="69" cy="58" rx="2.6" ry="3.3" fill="{INK}"/></g>
{eyes_extra}
<path d="M60 60 q-3 5 0 6.5" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>
{face_extra}
{mouth}
{front}
</g>
</svg>
"""


def brows(y=50, tilt=0, color=INK, w=2.6):
    return (
        f'<path d="M46 {y + tilt} q5 -3 10 0" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round"/>'
        f'<path d="M64 {y} q5 -3 10 {tilt}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round"/>'
    )


people = {
    # Prepper: boonie hat, big grey beard, olive field jacket with a pocket
    "bunkerbill": svg(
        "Bill Hargrove",
        bg="#d8d2b4",
        skin="#f0c8a4",
        shirt="#6b6f3e",
        blink_delay=0.4,
        neck_extra=f'<path d="M40 100 h14 v12 h-14 z" fill="#5a5e33" stroke="{INK}" stroke-width="2"/><path d="M40 104 h14" stroke="{INK}" stroke-width="2"/>',
        eyes_extra=brows(49, color="#6e6a63", w=3.2),
        face_extra=f'<path d="M38 60 C38 84 48 92 60 92 C72 92 82 84 82 60 C78 70 72 72 60 72 C48 72 42 70 38 60 Z" fill="#b9b4ab" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M50 70 q10 -5 20 0" fill="none" stroke="#8d877c" stroke-width="3" stroke-linecap="round"/>',
        mouth=f'<path d="M54 76 q6 4 12 0" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>',
        cheeks=False,
        front=f'<path d="M24 40 C30 36 90 36 96 40 C96 44 24 44 24 40 Z" fill="#7d7a46" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M38 40 C38 22 82 22 82 40 Z" fill="#8b884f" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M38 35 h44" stroke="#5f5c33" stroke-width="3"/>',
    ),
    # Linebacker: buzz cut, eye black, maroon jersey number 52
    "tj_linebacker": svg(
        "TJ Okafor",
        bg="#c9d7e4",
        skin="#7b4b2f",
        shirt="#8a2432",
        blink_delay=2.1,
        back="",
        neck_extra=f'<path d="M12 122 C14 96 36 86 60 86 C84 86 106 96 108 122 Z" fill="#8a2432" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M48 88 q12 9 24 0" fill="none" stroke="#f3eddf" stroke-width="4"/>'
        f'<text x="60" y="114" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="20" fill="#f3eddf">52</text>'
        f'<path d="M51 72 h18 v15 c-5 5 -13 5 -18 0 z" fill="#7b4b2f" stroke="{INK}" stroke-width="2.5"/>',
        eyes_extra=brows(50, w=3)
        + '<rect x="46" y="63" width="10" height="3" rx="1" fill="#1b1815"/><rect x="64" y="63" width="10" height="3" rx="1" fill="#1b1815"/>',
        front=f'<path d="M38 50 C38 28 82 28 82 50 C78 40 70 36 60 36 C50 36 42 40 38 50 Z" fill="#1f1a17" stroke="{INK}" stroke-width="2.5"/>',
        mouth=f'<path d="M50 70 q10 8 20 0 z" fill="#fff" stroke="{INK}" stroke-width="2.2"/>',
    ),
    # Runner: ponytail, teal sweatband, coral tank top
    "milemarker": svg(
        "Rosa Delgado",
        bg="#f1d8c5",
        skin="#c98d63",
        shirt="#e0735a",
        blink_delay=3.3,
        back=f'<path d="M78 40 C100 38 104 62 96 78 C92 66 88 56 80 52 Z" fill="#3a2418" stroke="{INK}" stroke-width="2.5"/>',
        neck_extra=f'<path d="M40 92 C44 104 50 112 50 122 M80 92 C76 104 70 112 70 122" fill="none" stroke="#f3eddf" stroke-width="3"/>',
        eyes_extra=brows(50),
        front=f'<path d="M37 52 C36 28 84 28 83 52 C76 42 66 40 60 40 C52 40 44 44 37 52 Z" fill="#3a2418" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M37 45 C46 38 74 38 83 45 L83 51 C74 44 46 44 37 51 Z" fill="#2f8f88" stroke="{INK}" stroke-width="2.2"/>',
    ),
    # Philosophy PhD: top bun, round glasses, mustard cardigan over a collar
    "kant_even": svg(
        "Priya Raman",
        bg="#dfe2cf",
        skin="#a96b49",
        shirt="#c9952e",
        blink_delay=1.0,
        back=f'<circle cx="60" cy="26" r="11" fill="#1c1513" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M30 80 C30 50 36 34 60 34 C84 34 90 50 90 80 Z" fill="#1c1513" stroke="{INK}" stroke-width="2.5"/>',
        neck_extra=f'<path d="M48 86 l12 12 l12 -12" fill="#f3eddf" stroke="{INK}" stroke-width="2.2"/>'
        f'<path d="M60 98 v24" stroke="{INK}" stroke-width="2"/><circle cx="60" cy="106" r="1.6" fill="{INK}"/><circle cx="60" cy="114" r="1.6" fill="{INK}"/>',
        eyes_extra=f'<circle cx="51" cy="58" r="7" fill="none" stroke="{INK}" stroke-width="2.2"/><circle cx="69" cy="58" r="7" fill="none" stroke="{INK}" stroke-width="2.2"/>'
        f'<path d="M58 57 q2 -2 4 0" fill="none" stroke="{INK}" stroke-width="2.2"/>' + brows(46, tilt=-1),
        front=f'<path d="M38 54 C38 34 52 32 60 34 C68 32 82 34 82 54 C76 44 68 40 60 42 C52 40 44 44 38 54 Z" fill="#1c1513" stroke="{INK}" stroke-width="2.5"/>',
        mouth=f'<path d="M54 70 q6 3 12 -1" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>',
    ),
    # Plumber: navy cap, bushy mustache, blue work shirt with a name patch
    "pipedreams": svg(
        "Gus Petrakis",
        bg="#cfe0df",
        skin="#e2b189",
        shirt="#3f6a9a",
        blink_delay=4.2,
        neck_extra=f'<path d="M48 86 l12 8 l12 -8" fill="none" stroke="{INK}" stroke-width="2.2"/>'
        f'<rect x="70" y="100" width="20" height="10" rx="2" fill="#f3eddf" stroke="{INK}" stroke-width="1.8"/>'
        f'<text x="80" y="108" text-anchor="middle" font-family="Georgia,serif" font-size="7" font-weight="700" fill="{INK}">GUS</text>',
        eyes_extra=brows(49, w=3.4),
        face_extra=f'<path d="M47 68 C50 63 58 64 60 66 C62 64 70 63 73 68 C70 72 64 70 60 69 C56 70 50 72 47 68 Z" fill="#3b2c22" stroke="{INK}" stroke-width="2"/>',
        mouth=f'<path d="M55 75 q5 3 10 0" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>',
        front=f'<path d="M37 46 C37 26 83 26 83 46 Z" fill="#23365c" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M36 46 C50 42 92 42 98 48 C88 52 50 50 36 48 Z" fill="#1b2a49" stroke="{INK}" stroke-width="2.5"/>'
        f'<circle cx="60" cy="27" r="2.5" fill="#1b2a49"/>',
    ),
    # Homemaker: curly auburn hair tied up in a red polka-dot headscarf
    "homefronthannah": svg(
        "Hannah Whitfield",
        bg="#f2dde0",
        skin="#f3d1b5",
        shirt="#7aa37a",
        blink_delay=2.7,
        back=f'<circle cx="38" cy="66" r="9" fill="#a5532e" stroke="{INK}" stroke-width="2.5"/><circle cx="82" cy="66" r="9" fill="#a5532e" stroke="{INK}" stroke-width="2.5"/>',
        neck_extra=f'<path d="M46 87 q14 10 28 0" fill="none" stroke="{INK}" stroke-width="2.2"/>'
        f'<circle cx="34" cy="106" r="3" fill="#f3eddf"/><circle cx="86" cy="104" r="3" fill="#f3eddf"/><circle cx="60" cy="112" r="3" fill="#f3eddf"/>',
        eyes_extra=brows(50) + f'<path d="M46 55 l-3 -2 M74 55 l3 -2" stroke="{INK}" stroke-width="1.8" stroke-linecap="round"/>',
        front=f'<path d="M37 54 C36 40 44 36 50 40 C54 36 66 36 70 40 C76 36 84 40 83 54 C78 46 70 44 60 44 C50 44 42 46 37 54 Z" fill="#a5532e" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M36 44 C36 22 84 22 84 44 C74 38 46 38 36 44 Z" fill="#c2372e" stroke="{INK}" stroke-width="2.5"/>'
        f'<circle cx="48" cy="34" r="2" fill="#f3eddf"/><circle cx="60" cy="30" r="2" fill="#f3eddf"/><circle cx="72" cy="34" r="2" fill="#f3eddf"/><circle cx="54" cy="40" r="1.6" fill="#f3eddf"/><circle cx="66" cy="40" r="1.6" fill="#f3eddf"/>'
        f'<path d="M58 22 C50 10 44 16 52 22 Z M62 22 C70 10 76 16 68 22 Z" fill="#c2372e" stroke="{INK}" stroke-width="2.2"/>',
        mouth=f'<path d="M51 69 q9 8 18 0" fill="#b5413a" stroke="{INK}" stroke-width="2.2"/>',
    ),
    # Dungeon master: purple wizard hat with stars, short beard, green hoodie, a d20
    "dm_rolls": svg(
        "Marcus Bell",
        bg="#e3dccb",
        skin="#8e5b3c",
        shirt="#3e6b4f",
        blink_delay=1.6,
        neck_extra=f'<path d="M44 88 C48 98 72 98 76 88" fill="none" stroke="{INK}" stroke-width="2.2"/>'
        f'<path d="M50 94 v12 M70 94 v12" stroke="#f3eddf" stroke-width="2"/>'
        f'<path d="M84 94 l9 5 v10 l-9 5 l-9 -5 v-10 z" fill="#d8b44a" stroke="{INK}" stroke-width="2"/>'
        f'<text x="84" y="108" text-anchor="middle" font-family="Georgia,serif" font-size="7" font-weight="700" fill="{INK}">20</text>',
        eyes_extra=brows(50, tilt=-2, w=3),
        face_extra=f'<path d="M40 64 C40 82 50 86 60 86 C70 86 80 82 80 64 C76 74 70 76 60 76 C50 76 44 74 40 64 Z" fill="#1f1714" stroke="{INK}" stroke-width="2.2"/>',
        mouth=f'<path d="M53 70 q7 5 14 0" fill="none" stroke="#f3eddf" stroke-width="2.4" stroke-linecap="round"/>',
        front=f'<path d="M30 44 C40 38 80 38 90 44 C80 48 40 48 30 44 Z" fill="#4b3577" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M40 43 C46 30 52 14 70 4 C66 16 74 30 80 43 Z" fill="#5d4391" stroke="{INK}" stroke-width="2.5"/>'
        f'<path d="M56 28 l1.5 3 3 .5 -2.2 2 .6 3 -2.9 -1.5 -2.9 1.5 .6 -3 -2.2 -2 3 -.5 z" fill="#e8c95a"/>'
        f'<circle cx="68" cy="36" r="1.8" fill="#e8c95a"/><circle cx="64" cy="18" r="1.4" fill="#e8c95a"/>',
    ),
}



# You: a friendly default for your own posts
people["me"] = svg(
    "you",
    bg="#efe0b0",
    skin="#e3ae86",
    shirt="#2f6f73",
    blink_delay=0.8,
    neck_extra=f'<path d="M48 87 q12 8 24 0" fill="none" stroke="{INK}" stroke-width="2.2"/>',
    eyes_extra=brows(49, w=2.8),
    mouth=f'<path d="M53 70 q8 5 15 -2" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>',
    front=f'<path d="M37 52 C34 30 52 26 62 30 C72 26 88 32 83 52 C80 42 74 38 66 40 C58 36 46 40 37 52 Z" fill="#4a3426" stroke="{INK}" stroke-width="2.5"/>',
)

OUT.mkdir(parents=True, exist_ok=True)
for handle, content in people.items():
    (OUT / f"{handle}.svg").write_text(content)
print("wrote", len(people), "avatars to", OUT)
