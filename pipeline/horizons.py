"""Small JPL Horizons client with a disk cache.

Requests go out one at a time with a pause between them, as the Horizons
fair use policy asks. Every response is cached under pipeline/cache so a
rebuild does not hit the API again.
"""

from __future__ import annotations

import hashlib
import json
import time
import urllib.parse
from pathlib import Path

import net

API = "https://ssd.jpl.nasa.gov/api/horizons.api"
CACHE = Path(__file__).resolve().parent / "cache" / "horizons"
PAUSE_S = 2.0
_last_call = 0.0


def _quote(value: str) -> str:
    return "'" + value + "'"


def query(params: dict[str, str]) -> str:
    """Return the plain text `result` of a Horizons API call."""
    global _last_call
    full = {"format": "json", "OBJ_DATA": "NO", "MAKE_EPHEM": "YES"}
    full.update(params)
    encoded = {k: (v if k == "format" else _quote(v)) for k, v in full.items()}
    url = API + "?" + urllib.parse.urlencode(encoded, quote_via=urllib.parse.quote)
    key = hashlib.sha1(url.encode()).hexdigest()[:20]
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{key}.json"
    if path.exists():
        return json.loads(path.read_text())["result"]
    wait = PAUSE_S - (time.time() - _last_call)
    if wait > 0:
        time.sleep(wait)
    body = net.get(url).decode()
    _last_call = time.time()
    data = json.loads(body)
    if "result" not in data:
        raise RuntimeError(f"Horizons error: {body[:400]}")
    if "$$SOE" not in data["result"]:
        raise RuntimeError(f"Horizons returned no ephemeris: {data['result'][:800]}")
    path.write_text(json.dumps({"url": url, "result": data["result"]}))
    return data["result"]


def rows(result: str) -> list[list[str]]:
    """Split the CSV block between $$SOE and $$EOE into stripped fields."""
    block = result.split("$$SOE", 1)[1].split("$$EOE", 1)[0]
    out = []
    for line in block.strip().splitlines():
        fields = [f.strip() for f in line.split(",")]
        if fields and fields[-1] == "":
            fields = fields[:-1]
        out.append(fields)
    return out


def header_value(result: str, label: str) -> str:
    """Return the text after `label` on its header line, or an empty string."""
    for line in result.splitlines():
        if line.startswith(label):
            return line.split(":", 1)[1].strip()
    return ""
