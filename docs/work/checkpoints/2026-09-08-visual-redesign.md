# Visual redesign checkpoint — 2026-09-08

## Scope

The Gallery landing and Angular product surfaces were redesigned as an independent product identity. Kois remains the publishing umbrella, but Gallery does not inherit Kois website styling as a shared visual system.

## Direction

- Gallery uses a restrained darkroom/contact-sheet language.
- The product canvas is light and neutral so photographs remain the strongest visual element.
- Product chrome uses crisp edges, thin rules, compact metadata, and a restrained blue utility accent.
- The visitor gallery keeps navigation and overlays quiet; image surfaces carry the visual weight.
- The landing site can be more expressive, but it now communicates Gallery as a photo-delivery product rather than as a Kois studio page.

## Implemented

- Reworked the Astro landing structure and styling.
- Reworked the Angular global product styling across authentication, administration, and visitor delivery.
- Added a responsive contact-sheet treatment to the landing hero.
- Added a dark navigation rail for the administrator workspace and a quiet visitor gallery treatment.
- Preserved existing product routes, test selectors, capability claims, and accessibility focus states.

## Verification

- `npm run format:check`
- `npm run lint`
- `npm run build:landing`
- `npm run build:web`
- Local rendered inspection at desktop and mobile breakpoints remains part of the landing/product release evidence.

## Follow-up

The final visual review should use approved real photography in a representative self-hosted gallery. The landing’s current image surfaces are intentionally synthetic and must not be presented as Lino or client work.
