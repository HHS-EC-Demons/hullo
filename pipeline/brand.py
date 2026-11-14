"""Brand assets that match the nav wordmark.

Writes `favicon.svg` (the initial as an outline from Gabarito at weight
800, so it needs no web font) and three HTML pages that
`rasterize.sh` serves on localhost and turns into the 32 px favicon, the 180 px touch icon and the
1200 x 630 og image with a headless browser, using the same font files the
site loads.
"""

from __future__ import annotations

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

PAPER = "#f2f0e9"
INK = "#17181b"
INK_2 = "#55555a"
SIGNAL = "#0a6b4b"


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
        f'<rect width="{size}" height="{size}" rx="12" fill="{PAPER}"/>'
        f'<path fill="{INK}" d="{path}"/></svg>\n'
    )


def page(width: int, height: int, body: str) -> str:
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: 'Next'; src: url('next.woff2') format('woff2'); font-weight: 400 900; }}
@font-face {{ font-family: 'Mono'; src: url('mono.woff2') format('woff2'); font-weight: 300 700; }}
html, body {{ margin: 0; width: {width}px; height: {height}px; overflow: hidden; background: {PAPER}; color: {INK}; }}
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
<div style="position:absolute;inset:0;padding:72px 84px;display:grid;grid-template-rows:auto 1fr auto;">
<div style="font-weight:800;font-size:76px;letter-spacing:-0.05em;line-height:1">{word}</div>
<div style="align-self:end;font-weight:800;font-size:92px;letter-spacing:-0.045em;line-height:0.98;max-width:1000px">Voyager 1 is about a day of light away from you.</div>
<div style="margin-top:36px;padding-top:26px;border-top:2px solid {SIGNAL};font-size:34px;line-height:1.3;color:{INK_2};max-width:940px">{line}</div>
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
