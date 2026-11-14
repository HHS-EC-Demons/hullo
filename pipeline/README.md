# Hullo data pipeline

Builds every data file the site ships under `site/public/data`, the Jezero basemap tiles under `site/public/tiles`, the photos under `site/public/img` and the Horizons check values the tests use under `site/src/lib/fixtures`.

```sh
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python build.py
```

`build.py deep moon sky mars images fixtures` runs single steps. Responses are cached in `cache/` (not committed), so a rebuild only calls the network for what is missing.

- `deep_space.py` asks JPL Horizons for daily geometric state vectors of Voyager 1 and 2, New Horizons, Pioneer 10 and 11 and Earth, 2026-01-01 to 2028-01-03, and works out distance, its rate and the travel time of a message sent from Earth's center.
- `moon.py` asks Horizons for hourly ranges and elevations from Apache Point (site 705) and Caussols near Grasse (site 010) to the Apollo 11, 14 and 15 and Lunokhod 1 and 2 reflectors, 2026-01-01 to 2028-01-01, and writes one file per month.
- `sky.py` writes `data/sky/stars.json` with every Yale Bright Star Catalogue star brighter than magnitude 5.5 (VizieR V/50, J2000) and the d3-celestial constellation figures (BSD 3-Clause), and one file per month with Horizons observer positions seen from Earth's center (quantity 1, astrometric RA and Dec, and quantity 29, constellation) of the five probes, the Moon, Mars and Eros at 00:00 UT each day.
- `mars.py` copies Ingenuity's waypoints and flight paths from JPL's Mars 2020 MMGIS map and bakes basemap tiles at zoom 13 to 16 around the flights.
- `images.py` downloads public domain photos from the NASA Image and Video Library by NASA ID.
- `brand.py` writes `favicon.svg` from the wordmark font and the pages that `./rasterize.sh` turns into the PNG favicon, touch icon and og image with headless `playwright-cli`.

Horizons calls go out one at a time with a 2 s pause, as its fair use policy asks.
