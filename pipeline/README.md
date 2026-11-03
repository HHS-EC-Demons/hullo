# Hullo data pipeline

These scripts build every data file the site ships under `site/public/data`, the Jezero basemap tiles under `site/public/tiles`, the photos under `site/src/assets/img`, the sound clips under `site/public/audio`, and the Horizons check values the tests use under `site/src/lib/fixtures`.

```sh
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python build.py
```

`build.py deep moon sky mars images fixtures brand` runs single steps. Responses are cached in `cache/` (not committed), so a rebuild only calls the network for what is missing. The other scripts run on their own, for example `.venv/bin/python silent_images.py`.

- `deep_space.py` requests daily geometric state vectors from JPL Horizons for Voyager 1 and 2, New Horizons, Pioneer 10 and 11 and Earth, 2026-01-01 to 2028-01-03. From the vectors the script works out the distance from Earth's center, its rate, how long a message sent from Earth's center takes to reach each probe, and how long a signal from the probe takes to reach Earth.
- `moon.py` requests hourly ranges and elevations from Horizons from Apache Point (site 705) and Caussols near Grasse (site 010) to the Apollo 11, 14 and 15 and Lunokhod 1 and 2 reflectors, 2026-01-01 to 2028-01-01, and writes one file per month.
- `sky.py` writes `data/sky/stars.json` with every Yale Bright Star Catalogue star brighter than magnitude 5.5 (VizieR V/50, J2000) and the d3-celestial constellation figures (BSD 3-Clause). The script also writes one file per month with Horizons observer positions seen from Earth's center (quantity 1, astrometric RA and Dec, and quantity 29, constellation) of the five probes, the Moon, Mars and Eros at 00:00 UT each day.
- `mars.py` copies Ingenuity's waypoints and flight paths from JPL's Mars 2020 MMGIS map and bakes basemap tiles around the flights, JPEG at zoom 13 to 16 and WebP at zoom 17 and 18 along the paths. Each flight's sol, date, distance, altitude, speed and duration come from NASA's Ingenuity flight log (PDF).
- `images.py` downloads the home page photos by NASA ID from the NASA Image and Video Library and saves each one with its ID, date and credit, then runs `images_planets.py`.
- `images_planets.py` owns every Moon, Mars and Orbit photo and `site/src/data/photos.json`. It fetches each photo by NASA ID, or from the Photojournal or HiRISE page when the library does not hold the file, and merges its entries into `photos.json`, so no rerun can shrink a photo or drop an entry. `.venv/bin/python images_planets.py <slug>` redoes one photo.
- `probe_photos.py` fetches one public domain photo of each deep space probe by NASA ID for the home and Deep space pages.
- `silent_images.py` fetches one public domain photo for each object on the Silent page by NASA ID, crops the photo to 4:3 and writes the title, date and credit to `site/src/data/silent-images.json`. The script stops if the library's credit for a JPL photo differs from the one written in the script.
- `orbit.py` crops LRO views of the six Apollo landing sites from public domain LROC NAC orthoimages at the PDS Imaging Node, downloading only the rows around each site with HTTP range requests.
- `audio.py` downloads real NASA sound clips, mixes them to mono, re-encodes them as small MP3 files with the ffmpeg build in imageio-ffmpeg, and stores 480 waveform peaks per clip so the page can draw the shape without downloading the audio.
- `brand.py` writes `favicon.svg` from the wordmark font and the pages that `./rasterize.sh` turns into the PNG favicon, touch icon and og image with headless `playwright-cli`.

Horizons calls go out one at a time with a 2 s pause, as the Horizons fair use policy asks.
