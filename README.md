# Hullo

A site for readers 10 to 14 about the hardware NASA left in space that still answers, from the Apollo laser mirrors to Voyager 1. Hullo was made for the NASA Space Apps Challenge 2026, challenge "Abandoned but not Forgotten". Every number on the site is worked out from NASA data or quoted from a dated source.

Live at https://hhs-ec-demons.github.io/hullo/

## Pages

- `/` shows how far Voyager 1 is from you in light time right now. Send Voyager 1 a message and watch the message travel, find the probes, the Moon, Mars and Eros on a sky chart among the real stars, and see which Deep Space Network dish is in contact with which spacecraft.
- `/deep-space` covers Voyager 1 and 2, New Horizons and Pioneer 10 and 11, with live light time, message travel time, the sky chart with the picked probe marked, a two year light time chart and the Pale Blue Dot.
- `/moon` has a to-scale laser shot from Apache Point or Grasse at the Apollo and Lunokhod reflectors, with the round trip time for this moment.
- `/mars` shows Ingenuity's 72 flights on JPL's Jezero map, one flight at a time, with NASA's flight log, the sound of its rotors and photos.
- `/orbit` shows the Apollo landing sites seen by LRO and the Mars landers seen by HiRISE, each next to a photo from landing.
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

The data comes from `pipeline/` (see its README). `.github/workflows/pages.yml` builds `site/` with `BASE_PATH=/<repo name>/` and deploys the result to GitHub Pages on every push to `main`.

The site is Astro 6 with React islands, Tailwind CSS 4, shadcn/ui on Radix, Motion, d3-scale and react-to-print. The site needs Node 22.

Hullo is not endorsed by NASA. Photos are NASA public domain images, credited next to each one with its NASA ID.
