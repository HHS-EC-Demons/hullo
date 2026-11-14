# Hullo

Hardware left in space that still answers. Space Apps 2026, Abandoned but not Forgotten.

[hhs-ec-demons.github.io/hullo](https://hhs-ec-demons.github.io/hullo/)

## Pages

| Page | What |
|---|---|
| `/` | Live light time to Voyager 1, DSN now |
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

Pushes to `main` deploy to GitHub Pages. Data scripts are in `pipeline/`. Astro 6, React, Tailwind 4, Node 22.

Not endorsed by NASA. Photos are NASA public domain.
