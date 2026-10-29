"""Rebuild every data file the site ships.

Run from the pipeline folder with `.venv/bin/python build.py`.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import deep_space
import images
import mars
import moon

ROOT = Path(__file__).resolve().parent
SITE = ROOT.parent / "site"
PUBLIC = SITE / "public"
DATA = PUBLIC / "data"
FIXTURES = SITE / "src" / "lib" / "fixtures"


def write(path: Path, payload: dict | list, compact: bool = True) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if compact:
        path.write_text(json.dumps(payload, separators=(",", ":")))
    else:
        path.write_text(json.dumps(payload, indent=1) + "\n")
    print(f"wrote {path.relative_to(SITE)} ({path.stat().st_size / 1024:.1f} KB)")


def main(steps: list[str]) -> None:
    run = set(steps) or {"deep", "moon", "mars", "images", "fixtures"}
    if "deep" in run:
        write(DATA / "deep-space.json", deep_space.build())
    if "moon" in run:
        write(DATA / "moon" / "index.json", moon.build(DATA / "moon"), compact=False)
    if "mars" in run:
        print(mars.build(PUBLIC))
    if "images" in run:
        for item in images.build(PUBLIC):
            print(f"image {item['slug']} {item['width']}x{item['height']}")
    if "fixtures" in run:
        write(FIXTURES / "horizons-deep-space.json", deep_space.fixtures(), compact=False)
        write(FIXTURES / "horizons-moon.json", moon.fixtures(), compact=False)


if __name__ == "__main__":
    main(sys.argv[1:])
