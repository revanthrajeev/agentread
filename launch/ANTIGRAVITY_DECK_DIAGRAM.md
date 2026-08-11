# Antigravity prompt — AgentRead founder deck, Slide 6 wedge diagram

Generate ONE image and drop it in `public/deck/` as **`wedge-diagram.png`**.

This is for Slide 6 ("The Wedge") of the AgentRead founder deck
(`~/Desktop/AgentRead_Founder_Deck.pptx`). That slide currently argues the core
positioning in text only — "nobody wants a score, they want traffic" — and the
argument is spatial, so it needs a diagram. The whole pitch rests on ONE
distinction: competitors observe the request from outside; AgentRead sits
inside it and changes what the crawler receives.

## Exact spec — two rows, do not merge or reorder them

A **two-row comparison diagram**, flat vector line-art, each row a horizontal
left-to-right flow. Rows are stacked with clear vertical separation and a thin
horizontal divider line between them.

### ROW 1 — label it `MEASUREMENT TOOLS` (upper-left of the row, small caps)

Three elements, left to right, connected by **solid** arrows:

1. **AI Crawler** (box)
2. **Your Site** (box)
3. **Raw HTML** (box)

Then, positioned **below and offset to the right**, a fourth detached box:

4. **Dashboard: "you scored 41"** (box)

Box 4 connects **upward to box 3 with a DOTTED line, and that line has an
arrowhead pointing INTO box 4** — meaning it only reads the result. Box 4 must
be visually detached from the main flow — it is not in the path. This
detachment is the entire point of the row.

### ROW 2 — label it `AGENTREAD` (upper-left of the row, small caps)

Four elements, left to right, connected by **solid** arrows:

1. **AI Crawler** (box)
2. **AgentRead Serve** (box) — the highlighted one, see Style
3. **Your Site** (box)
4. **Clean Markdown** (box)

All four are inline on the same horizontal axis, all connected by solid
arrows. Nothing is detached in this row.

Count before finishing: Row 1 has 4 boxes (3 inline + 1 detached), Row 2 has 4
boxes (all inline). Do not add, drop, or merge any box.

## Style

- Each box: rounded rectangle, thin 1.5px outline stroke, label centered
  inside, clean geometric sans-serif (Inter, Sora, or similar), one line of
  text per box. Boxes in a row are equal height.
- Background: solid near-black `#0A0A0F` (the deck slide background is this
  exact colour, so it will sit flush). Transparent PNG is also acceptable.
- **Default boxes** — every box except Row 2 box 2: fill `#15151E`, outline
  `#2A2A38`, text `#F2F2F7`.
- **Row 2, box 2 ("AgentRead Serve") ONLY**: fill with violet `#9085E9`, text
  near-black `#0A0A0F`. This is the single coloured box in the whole image —
  the one moment where the bytes actually change. Nothing else uses colour
  fill.
- **Row 1 box 4 ("Dashboard")** stays default fill but its outline and its
  dotted connector are muted grey `#8B8B9E`, and the box sits at ~70% opacity
  — it should read as peripheral.
- **"Clean Markdown"** (Row 2, box 4): default fill, but outline and text in
  cyan `#22D3EE` to mark it as the good outcome.
- Row labels (`MEASUREMENT TOOLS`, `AGENTREAD`): monospace, ~60% size of box
  labels, colour `#8B8B9E` for row 1 and `#22D3EE` for row 2.
- Arrows: thin, 1.5px, colour `#8B8B9E`, simple triangular arrowheads.
- Divider between rows: 1px horizontal line, `#2A2A38`, full width, low
  emphasis.
- No icons, no clipart, no illustrations inside boxes — text labels only.
- No gradients, no drop shadows, no glow, no photorealism, no 3D.

## Dimensions

**1920×1000px**, PNG, landscape. Under 400KB; compress if needed.

## Why these constraints

The deck's credibility rests on being precise rather than promotional — it is
attached to accelerator applications where a technical reader will check
claims. The two rows must be structurally different in an obvious, visual way:
Row 1's fourth box is detached and dotted because measurement tools sit
*outside* the request and only report on it; Row 2 has no detached box because
AgentRead sits *inside* the request path. If both rows are drawn as plain
horizontal chains the diagram says nothing and actively contradicts the slide
headline. The single violet box carries the whole argument — resist colouring
anything else, because a diagram where five things are highlighted highlights
nothing.

## After generation

Confirm all of the following before finishing:
- Row 1 has exactly one DOTTED connector, and it is the only dotted line.
- Row 1's "Dashboard" box is visibly detached from the horizontal flow.
- Exactly ONE box in the whole image has a coloured fill ("AgentRead Serve").
- Background is `#0A0A0F` or transparent.
- No text is misspelled — check "AgentRead", "Markdown", "Crawler".

---

# Second image (optional) — title slide background

Only if the deck's Slide 1 needs a background. Save as
`public/deck/title-bg.png`.

Abstract dark technical background. Solid `#0A0A0F` base. Thin 1px wireframe
lines in violet `#9085E9` and cyan `#22D3EE` at roughly 15% opacity, forming a
sparse network-topology / node-graph pattern concentrated in the **right third
only** — the left two-thirds must stay near-empty so slide text remains
legible over it. No text anywhere in the image. No people, no faces, no stock
photography, no glowing "AI brain" imagery. Flat vector, high contrast,
restrained — Vercel/Linear documentation aesthetic, not sci-fi.

**2560×1440px**, PNG, under 500KB.
