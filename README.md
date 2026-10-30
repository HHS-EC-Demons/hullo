# Hullo

A story site for readers 10 to 14 about the hardware NASA left behind that still answers back, from the Apollo laser mirrors to Voyager 1. NASA Space Apps Challenge 2026, Abandoned but not Forgotten.

- `/` Voyager 1's light time right now, a message you can send and follow, and a sky chart of the probes, Moon, Mars and Eros among the real stars
- `/deep-space` five probes, live light time, the sky chart with the picked probe marked, a two year light time chart, the Pale Blue Dot and the light time convention
- `/moon` a to-scale laser shot from Apache Point or Grasse at the Apollo and Lunokhod reflectors
- `/mars` Ingenuity's 72 flights on JPL's Jezero map, one flight at a time
- `/silent` dated list of hardware that no longer answers
- `/sources` every dataset and fact with its license, the AI use statement and the age group

```sh
cd site && npm ci
npx vitest run
npx astro build
```

The data comes from `pipeline/` (see its README). `.github/workflows/pages.yml` builds `site/` with `BASE_PATH=/<repo name>/` and deploys it to GitHub Pages.
