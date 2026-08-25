# Antigravity prompt — hero background art

Paste this into Antigravity's image generation. Goal: give the hero section atmospheric
depth (like DoableClaw's nebula background) without losing AgentRead's existing violet →
cyan brand gradient or its terminal/dev-tool identity.

## Prompt

```
Generate a dark, abstract technology background image, 2400x1400px, for a SaaS developer
tool's hero section. Pure near-black base (#050208), with a soft diffused glow in the
upper-left in violet/purple (#7c5cff) and a matching soft glow in the upper-right in cyan
(#22d3ee) — the two glows should blend toward the center like nebula clouds, low opacity,
heavily blurred, no hard edges. Overlay a very faint, barely-visible grid of thin straight
lines (data/network aesthetic, opacity under 8%) across the whole canvas, evoking structured
data flowing between machines rather than organic clouds. No text, no logos, no UI elements,
no stars/sparkles (avoid a literal space/cosmic look — this should read as "data network,"
not "galaxy"). Should work as a background image sitting behind foreground text and UI cards
without competing for attention — keep the center-vertical band relatively calm/darker so
white headline text stays readable on top of it. Style: minimal, premium, technical, similar
to Vercel/Linear/Stripe dark-mode marketing sites.
```

## Where it goes

Once generated, save as `public/hero-bg.png` (or `.webp`, compressed) and reference it as a
background-image on the `.hero` class in `src/app/globals.css` — keep the existing gradient
blobs as a fallback/overlay rather than replacing them outright, so the change is additive
and easy to revert if it doesn't read well against the terminal demo panel.
