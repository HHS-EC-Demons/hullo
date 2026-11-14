"""Brand assets that match the nav wordmark.

Writes `favicon.svg` (the initial as an outline from Gabarito at weight
800, so it needs no web font) and three HTML pages that
`rasterize.sh` serves on localhost and turns into the 32 px favicon, the 180 px touch icon and the
1200 x 630 og image with a headless browser, using the same font files the
site loads. The og image carries the real sky around Voyager 1, drawn from
the site's own star and position files.
"""

from __future__ import annotations

import json
import math
import re
import shutil
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent
SITE = ROOT.parent / "site"
FONTS = SITE / "node_modules" / "@fontsource-variable"
NEXT = FONTS / "gabarito" / "files" / "gabarito-latin-wght-normal.woff2"
MONO = FONTS / "spline-sans-mono" / "files" / "spline-sans-mono-latin-wght-normal.woff2"
OUT = ROOT / "cache" / "brand"

VIOLET = "#0d0a18"
TEXT = "#eeeaf9"
MUTED = "#a69fc0"
LILAC = "#b6a6ff"
LASER = "#3df58c"
SKY = SITE / "public" / "data" / "sky"


def brand() -> tuple[str, str]:
    text = (SITE / "src" / "brand.ts").read_text()
    name = re.search(r"BRAND = '([^']+)'", text).group(1)
    line = re.search(r"BRAND_LINE =\s*'([^']+)'", text).group(1)
    return name, line


def favicon_svg(initial: str) -> str:
    font = instancer.instantiateVariableFont(TTFont(NEXT), {"wght": 800})
    glyphs = font.getGlyphSet()
    gname = font.getBestCmap()[ord(initial)]
    bounds = BoundsPen(glyphs)
    glyphs[gname].draw(bounds)
    x0, y0, x1, y1 = bounds.bounds
    size = 64
    scale = 46 / (y1 - y0)
    w = (x1 - x0) * scale
    dx = (size - w) / 2 - x0 * scale
    dy = (size + (y1 - y0) * scale) / 2 + y0 * scale
    pen = SVGPathPen(glyphs)
    glyphs[gname].draw(TransformPen(pen, (scale, 0, 0, -scale, dx, dy)))
    path = re.sub(r"\d+\.\d+", lambda m: f"{float(m.group(0)):.2f}".rstrip("0").rstrip("."), pen.getCommands())
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">'
        f'<rect width="{size}" height="{size}" rx="12" fill="{VIOLET}"/>'
        f'<path fill="{TEXT}" d="{path}"/></svg>\n'
    )


def sky_svg(width: int, height: int) -> str:
    """Real stars and constellation lines around Voyager 1 on 18 Nov 2026,
    in a tangent plane projection on the right of the og image."""
    data = json.loads((SKY / "stars.json").read_text())
    index = json.loads((SKY / "index.json").read_text())
    month = json.loads((SKY / "2026-11.json").read_text())
    slot = [b["key"] for b in index["bodies"]].index("voyager1")
    row = month["days"][17]
    ra0, dec0 = math.radians(row[slot * 3]), math.radians(row[slot * 3 + 1])
    cx, cy, scale = 930.0, 300.0, 820.0

    def project(ra_deg: float, dec_deg: float) -> tuple[float, float] | None:
        ra, dec = math.radians(ra_deg), math.radians(dec_deg)
        cosc = math.sin(dec0) * math.sin(dec) + math.cos(dec0) * math.cos(dec) * math.cos(ra - ra0)
        if cosc < 0.6:
            return None
        x = math.cos(dec) * math.sin(ra - ra0) / cosc
        y = (math.cos(dec0) * math.sin(dec) - math.sin(dec0) * math.cos(dec) * math.cos(ra - ra0)) / cosc
        return cx - x * scale, cy - y * scale

    parts = []
    for line in data["lines"]:
        pts = [project(line[i], line[i + 1]) for i in range(0, len(line), 2)]
        run: list[str] = []
        for pt in pts + [None]:
            if pt is None:
                if len(run) > 1:
                    parts.append(f'<polyline points="{" ".join(run)}"/>')
                run = []
            else:
                run.append(f"{pt[0]:.1f},{pt[1]:.1f}")
    lines_svg = f'<g fill="none" stroke="{LILAC}" stroke-opacity="0.34" stroke-width="1.4">{"".join(parts)}</g>'
    stars = data["stars"]
    dots = []
    for i in range(0, len(stars), 3):
        pt = project(stars[i], stars[i + 1])
        if pt is None:
            continue
        r = max(0.9, (6.0 - stars[i + 2]) * 0.62)
        dots.append(f'<circle cx="{pt[0]:.1f}" cy="{pt[1]:.1f}" r="{r:.2f}"/>')
    stars_svg = f'<g fill="{TEXT}">{"".join(dots)}</g>'
    mark = (
        f'<circle cx="{cx}" cy="{cy}" r="11" fill="{VIOLET}" stroke="{LASER}" stroke-width="3"/>'
        f'<circle cx="{cx}" cy="{cy}" r="4" fill="{LASER}"/>'
        f'<text x="{cx + 20}" y="{cy + 8}" fill="{TEXT}" font-size="24" font-weight="700" '
        f'paint-order="stroke" stroke="{VIOLET}" stroke-width="6" stroke-linejoin="round">Voyager 1</text>'
    )
    return (
        f'<svg style="position:absolute;inset:0" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
        f'<defs><clipPath id="c"><rect x="700" y="0" width="{width - 700}" height="{height}"/></clipPath></defs>'
        f'<g clip-path="url(#c)">{lines_svg}{stars_svg}{mark}</g></svg>'
    )


def page(width: int, height: int, body: str) -> str:
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: 'Next'; src: url('next.woff2') format('woff2'); font-weight: 400 900; }}
@font-face {{ font-family: 'Mono'; src: url('mono.woff2') format('woff2'); font-weight: 300 700; }}
html, body {{ margin: 0; width: {width}px; height: {height}px; overflow: hidden; background: {VIOLET}; color: {TEXT}; }}
body {{ font-family: 'Next', sans-serif; }}
</style></head><body>{body}</body></html>
"""


def build() -> list[Path]:
    name, line = brand()
    word = name.lower()
    OUT.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(NEXT, OUT / "next.woff2")
    shutil.copyfile(MONO, OUT / "mono.woff2")
    (SITE / "public" / "favicon.svg").write_text(favicon_svg(word[0]))

    icon = lambda px: page(px, px, f"""
<div style="width:{px}px;height:{px}px;display:grid;place-items:center;">
<span style="font-weight:800;font-size:{px * 0.9:.1f}px;letter-spacing:-0.05em;line-height:1;transform:translateY(-{px * 0.035:.1f}px)">{word[0]}</span>
</div>""")
    og = page(1200, 630, f"""
{sky_svg(1200, 630)}
<div style="position:absolute;inset:0;padding:72px 84px;display:grid;grid-template-rows:auto 1fr auto;">
<div style="font-weight:800;font-size:76px;letter-spacing:-0.05em;line-height:1">{word}</div>
<div style="align-self:end;font-weight:800;font-size:80px;letter-spacing:-0.045em;line-height:0.98;max-width:640px">Voyager 1 is about a day of light away from you.</div>
<div style="margin-top:36px;padding-top:26px;border-top:2px solid {LASER};font-size:30px;line-height:1.3;color:{MUTED};max-width:640px">{line}</div>
</div>""")
    files = {"favicon-32.html": icon(32), "apple-touch-icon.html": icon(180), "og.html": og}
    paths = []
    for fname, html in files.items():
        p = OUT / fname
        p.write_text(html)
        paths.append(p)
    return paths


if __name__ == "__main__":
    for p in build():
        print(p)
