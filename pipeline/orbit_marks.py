"""Rings, zoomed insets and scale bars for the HiRISE views on the Orbit page.

Each ring is placed from evidence that NASA or the HiRISE team published
for that image, and the method is written next to it:

- Viking 1 and 2: the end of the yellow "Lander" leader line in the
  annotated version of PIA01881 or PIA01882 (figure 1), which is pixel for
  pixel the same image as the plain release the Orbit view is cut from.
- Spirit: the HiRISE caption of ESP_021925_1650 says the rover is the
  brightest spot in the image, so the ring sits on the brightest pixel.
- Opportunity: the HiRISE caption of ESP_050177_1780 says the lander rests
  at the center of the bowl of Eagle crater, so the ring sits on the bright
  hardware at the center of that crater.
- Phoenix: the PIA22223 caption names the lander as the top feature in both
  figures, and the two figures line up to within 1 px, so one ring marks
  the lander in both.
- InSight 2018: the HiRISE page lists this cut as the InSight hardware
  cutout at full resolution, and its labeled release shows the lander as
  the bright spot with two dark round solar arrays. The ring sits on it.
- InSight 2024: PIA26515 is NASA's HiRISE view of InSight, and the ring
  sits on the same two dark round solar arrays inside the faded blast mark.

Each scale bar comes from a pixel scale that is known for that file:

- Map projected HiRISE products give MAP_SCALE in their PDS label. A file
  cut at full resolution keeps it. East to west ground meters per pixel are
  MAP_SCALE * cos(lat) / cos(CENTER_LATITUDE) for the equirectangular
  products and MAP_SCALE * (1 + sin(lat)) / 2 for the polar stereographic
  ones, whose scale is true at the pole. A file scaled after cutting is
  corrected by that factor.
- PIA01881 matches its RED browse image at 0.255 m per pixel, the label's
  0.25 m within 2%, so the figure is at full resolution.
- PIA26515 names no observation, so its scale comes from the 100 m bar NASA
  printed on it, 330 px long.
- Viking 2, Spirit and Opportunity have no pixel scale that could be
  checked, so their views get a ring and an inset but no scale bar.

Run with .venv/bin/python orbit_marks.py. It writes
site/src/data/orbit-marks.json.
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

import numpy as np
from PIL import Image

import images
import images_planets

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parent
HIRISE_CACHE = ROOT / "cache" / "hirise"
PDS = "https://hirise-pds.lpl.arizona.edu/PDS/RDR"
OUT = ROOT.parent / "site" / "src" / "data" / "orbit-marks.json"
RING = 0.08


def raw_path(slug: str) -> Path:
    item = next(p for p in images_planets.PHOTOS if p["slug"] == slug)
    path = images.CACHE / "direct" / f"{item['id']}-{item['url'].rsplit('/', 1)[1]}"
    images.get(item["url"], path)
    return path


def raw(slug: str) -> Image.Image:
    return Image.open(raw_path(slug))


def written_box(slug: str, size: tuple[int, int]) -> tuple[float, float, float, float]:
    item = next(p for p in images_planets.PHOTOS if p["slug"] == slug)
    w, h = size
    if "box" in item:
        return item["box"]
    if "crop" in item:
        l, t, r, b = item["crop"]
        return (round(l * w), round(t * h), round(r * w), round(b * h))
    return (0, 0, w, h)


def fraction(slug: str, size: tuple[int, int], x: float, y: float) -> list[float]:
    l, t, r, b = written_box(slug, size)
    return [round((x - l) / (r - l), 4), round((y - t) / (b - t), 4)]


def scale_factor(slug: str, size: tuple[int, int]) -> float:
    l, t, r, b = written_box(slug, size)
    meta = json.loads(images_planets.META.read_text())[slug]
    return (r - l) / meta["width"]


def label(obs: str, kind: str = "RED") -> tuple[dict, str]:
    orbit = int(obs.split("_")[1])
    folder = f"{obs[:3]}/ORB_{orbit // 100 * 100:06d}_{orbit // 100 * 100 + 99:06d}/{obs}"
    url = f"{PDS}/{folder}/{obs}_{kind}.LBL"
    path = HIRISE_CACHE / f"{obs}_{kind}.LBL"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(images.net.get(url))
    text = path.read_text()
    out = {"url": url, "type": re.search(r'MAP_PROJECTION_TYPE\s*=\s*"([^"]+)"', text).group(1)}
    for key in ("MAP_SCALE", "CENTER_LATITUDE"):
        out[key] = float(re.search(rf"^\s*{key}\s*=\s*([-\d.]+)", text, re.M).group(1))
    return out, url


def ground(obs: str, lat: float, kind: str = "RED") -> tuple[float, str]:
    lab, url = label(obs, kind)
    if lab["type"] == "EQUIRECTANGULAR":
        mpp = lab["MAP_SCALE"] * math.cos(math.radians(lat)) / math.cos(math.radians(lab["CENTER_LATITUDE"]))
    else:
        mpp = lab["MAP_SCALE"] * (1 + math.sin(math.radians(lat))) / 2
    return mpp, url


def yellow_tip(path: Path, box: tuple[int, int, int, int]) -> tuple[int, int]:
    a = np.asarray(Image.open(path).convert("RGB")).astype(int)
    x0, y0, x1, y1 = box
    w = a[y0:y1, x0:x1]
    m = (w[:, :, 0] > 150) & (w[:, :, 1] > 140) & (w[:, :, 2] < 120) & ((w[:, :, 0] - w[:, :, 2]) > 60)
    ys, xs = np.nonzero(m)
    i = sorted(range(len(ys)), key=lambda k: (-ys[k], xs[k]))[0]
    return x0 + int(xs[i]), y0 + int(ys[i])


def lander_near(path: Path, tip: tuple[int, int], r: int = 25) -> tuple[float, float]:
    g = np.asarray(Image.open(path).convert("L")).astype(float)
    tx, ty = tip
    w = g[ty - r:ty + r, tx - r:tx + r]
    lo = np.unravel_index(np.argmin(w), w.shape)
    hi = np.unravel_index(np.argmax(w), w.shape)
    return tx - r + (lo[1] + hi[1]) / 2, ty - r + (lo[0] + hi[0]) / 2


def peak(img: Image.Image, box: tuple[int, int, int, int], mode: str) -> tuple[float, float]:
    a = np.asarray(img.convert("RGB")).astype(float)
    x0, y0, x1, y1 = box
    w = a[y0:y1, x0:x1]
    if mode == "bright":
        v = w.sum(2)
        i = np.unravel_index(np.argmax(v), v.shape)
        return x0 + i[1], y0 + i[0]
    if mode == "blue":
        v = w[:, :, 2] - 0.5 * (w[:, :, 0] + w[:, :, 1])
        i = np.unravel_index(np.argmax(v), v.shape)
        return x0 + i[1], y0 + i[0]
    v = w.sum(2)
    ys, xs = np.nonzero(v <= np.percentile(v, 1.5))
    return x0 + xs.mean(), y0 + ys.mean()


def figure(url: str) -> Path:
    path = images.CACHE / "direct" / ("annotated-" + url.rsplit("/", 1)[1])
    images.get(url, path)
    return path


def build() -> dict:
    marks: dict[str, dict] = {}

    for slug, fig, search, obs, lat in (
        ("orbit-viking1-hirise", f"{images_planets.PJ}/pia01/pia01881/figures/PIA01881_fig1.jpg", (1300, 2900, 1800, 3400), "PSP_001521_2025", 22.27),
        ("orbit-viking2-hirise", f"{images_planets.PJ}/pia01/pia01882/figures/PIA01882_fig1.jpg", (1600, 3100, 2200, 3600), "PSP_001501_2280", 47.6673),
    ):
        annotated = figure(fig)
        plain = raw(slug)
        x, y = lander_near(raw_path(slug), yellow_tip(annotated, search))
        entry = {
            "ring": fraction(slug, plain.size, x, y),
            "ring_size": RING,
            "method": f"End of the Lander leader line in NASA's annotated {fig.rsplit('/', 1)[1]}, the same pixels as the plain release.",
        }
        if slug == "orbit-viking1-hirise":
            mpp, url = ground(obs, lat)
            entry["m_per_px"] = round(mpp * scale_factor(slug, plain.size), 4)
            entry["scale"] = f"MAP_SCALE 0.25 m in {url}, east to west at {lat}° N. The figure matches the RED browse image at 0.255 m per pixel, so it is at full resolution."
        else:
            entry["scale"] = "No scale bar. The figure has too little relief to match against the browse image, so its pixel scale could not be checked."
        marks[slug] = entry

    img = raw("orbit-spirit-hirise")
    x, y = peak(img, (0, 0, img.width, img.height), "bright")
    marks["orbit-spirit-hirise"] = {
        "ring": fraction("orbit-spirit-hirise", img.size, x, y),
        "ring_size": RING,
        "method": "Brightest pixel in the image, where the HiRISE caption of ESP_021925_1650 says Spirit is the brightest spot.",
        "scale": "No scale bar. The HiRISE page does not give the scale of this cut and it could not be matched to the browse image.",
    }

    img = raw("orbit-opportunity-hirise")
    x, y = peak(img, (880, 260, 1000, 370), "bright")
    marks["orbit-opportunity-hirise"] = {
        "ring": fraction("orbit-opportunity-hirise", img.size, x, y),
        "ring_size": RING,
        "method": "Bright hardware at the center of the crater the HiRISE caption of ESP_050177_1780 names as Eagle crater, where it says the lander rests.",
        "scale": "No scale bar. The HiRISE page does not give the scale of this cut and it could not be matched to the browse image.",
    }

    fig1 = raw("orbit-phoenix-2008")
    x, y = peak(fig1, (440, 60, 600, 200), "blue")
    for slug, obs in (("orbit-phoenix-2008", "PSP_009290_2485"), ("orbit-phoenix-2017", "ESP_053451_2485")):
        mpp, url = ground(obs, 68.22)
        marks[slug] = {
            "ring": fraction(slug, fig1.size, x, y),
            "ring_size": RING,
            "m_per_px": round(mpp * scale_factor(slug, fig1.size), 4),
            "method": "The feature the PIA22223 caption names as the lander (top). Figures 1 and 2 line up to within 1 px.",
            "scale": f"MAP_SCALE 0.25 m in {url}, polar stereographic, at 68.22° N. The caption says each figure is about 300 m wide, which the 1286 px width at this scale matches.",
        }

    img = raw("orbit-insight-2018")
    x, y = peak(img, (700, 300, 1220, 780), "bright")
    mpp, url = ground("ESP_058005_1845", 4.495)
    marks["orbit-insight-2018"] = {
        "ring": fraction("orbit-insight-2018", img.size, x, y),
        "ring_size": RING,
        "m_per_px": round(mpp * scale_factor("orbit-insight-2018", img.size), 4),
        "method": "The bright spot with two dark round solar arrays, the InSight lander in the HiRISE full resolution hardware cutout and in the labeled release ESP_058005_1845-labels.",
        "scale": f"MAP_SCALE 0.25 m in {url}, a full resolution cutout, scaled to 1400 px wide on this site.",
    }

    img = raw("orbit-insight-2024")
    x, y = peak(img, (410, 440, 510, 530), "dark")
    marks["orbit-insight-2024"] = {
        "ring": fraction("orbit-insight-2024", img.size, x, y),
        "ring_size": RING,
        "m_per_px": round(100 / 330 * scale_factor("orbit-insight-2024", img.size), 4),
        "method": "The two dark round solar arrays inside the faded blast mark in PIA26515, NASA's HiRISE view of InSight.",
        "scale": "The 100 m bar NASA printed on PIA26515, 330 px long. The bar is cropped out of the view on this site.",
    }

    OUT.write_text(json.dumps(marks, indent=1, ensure_ascii=False) + "\n")
    return marks


if __name__ == "__main__":
    for slug, m in build().items():
        print(slug, m["ring"], m.get("m_per_px"))
