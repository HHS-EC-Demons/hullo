# Hullo

Hardware left in space that still answers. Space Apps 2026, Abandoned but not Forgotten.

[sayhullo.netlify.app](https://sayhullo.netlify.app/)

Demo slides, [Google Slides](https://docs.google.com/presentation/d/1ohCjZyj6Z1oQATFBRAb-xBAmgeboA-MMtwosfDGW7dc/edit?usp=sharing)

## Pages

| Page | What |
|---|---|
| `/` | Hardware NASA left, 1967 to now |
| `/live` | Live light time to Voyager 1, DSN now |
| `/moon` | Laser echo off Apollo and Lunokhod reflectors |
| `/mars` | Ingenuity's 72 flights over Jezero crater |
| `/orbit` | Apollo and Mars landing sites seen from orbit |
| `/deep-space` | Five probes, sky chart, message travel |
| `/silent` | NASA legacy hardware and when each mission ended |
| `/passport` | Stamps and a printable certificate |
| `/classroom` | Three printable worksheets with answer keys |
| `/sources` | Every dataset, license and AI use |

## Build

```sh
cd site && npm ci
npx vitest run
npx astro build
```

`netlify deploy --build --prod` from the repo root publishes the site to Netlify. Data scripts are in `pipeline/`. The slides are drawn in `deck/slides.html` at 1920 by 1080 px and rebuilt in Google Slides with the same text, photos and screenshots. Astro 6, React, Tailwind 4, Node 22.

Not endorsed by NASA. Photos are NASA public domain. The code is under the Apache 2.0 license.
