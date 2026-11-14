# Hullo

A site for readers 10 to 14 about the hardware NASA left in space that still answers, from the Apollo laser mirrors to Voyager 1. It was made for the NASA Space Apps Challenge 2026, challenge "Abandoned but not Forgotten". Every number on it is worked out from NASA data or quoted from a dated source.

Live at https://hhs-ec-demons.github.io/hullo/

## Pages

- `/` shows how far Voyager 1 is from you in light time right now. You can send it a message and watch it travel, see the probes, the Moon, Mars and Eros on a sky chart among the real stars, and see which Deep Space Network dish is talking to which spacecraft.
- `/deep-space` covers Voyager 1 and 2, New Horizons and Pioneer 10 and 11, with live light time, message travel time, the sky chart with the picked probe marked, a two year light time chart and the Pale Blue Dot.
- `/moon` fires a to-scale laser shot from Apache Point or Grasse at the Apollo and Lunokhod reflectors and gives the round trip time for this moment.
- `/mars` shows Ingenuity's 72 flights on JPL's Jezero map, one flight at a time, with NASA's flight log, the sound of its rotors and photos.
- `/orbit` shows the Apollo landing sites seen by LRO and the Mars landers seen by HiRISE, each next to a photo from when it landed.
- `/silent` has a timeline of when each object went quiet, from 1966 to today, next to the ones that still answer, and a dated list with what each one found and a NASA photo.
- `/passport` collects a stamp for each object you reach on the site, with the real figure from that moment, and prints a certificate. Stamps stay in your browser.
- `/classroom` has three printable worksheets (the Moon's distance from a laser round trip, Voyager 1's distance from its light time, Ingenuity's average speed) that use the site's numbers at the moment you print. Each one has an answer key on a second page.
- `/sources` lists every dataset and fact with its license, the software used, the AI use statement and the age group.

## Build

```sh
cd site && npm ci
npx vitest run
npx astro build
```

The data comes from `pipeline/` (see its README). `.github/workflows/pages.yml` builds `site/` with `BASE_PATH=/<repo name>/` and deploys it to GitHub Pages on every push to `main`.

The site is Astro 6 with React islands, Tailwind CSS 4, shadcn/ui on Radix, Motion, d3-scale and react-to-print. It needs Node 22.

Hullo is not endorsed by NASA. Photos are NASA public domain images, credited next to each one with its NASA ID.
