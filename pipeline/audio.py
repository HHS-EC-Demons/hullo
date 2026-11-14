"""Real NASA sound clips, re-encoded small, with their waveform peaks.

Each clip is downloaded from its NASA page, mixed to mono and re-encoded
as MP3 with the ffmpeg build that ships in imageio-ffmpeg. The peaks the
site draws as the waveform are the loudest sample in each of 480 equal
slices of the same decoded audio, so the drawing matches the file and the
page never has to download the audio just to show its shape.
"""

from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path

import imageio_ffmpeg
import numpy as np

import net

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "cache" / "audio"
SITE = ROOT.parent / "site"
BARS = 480

CLIPS = [
    {
        "id": "ingenuity-rotors",
        "url": "https://assets.science.nasa.gov/content/dam/science/psd/mars/downloadable_items/4/46087_20210507_HelicopterFliesOnMars.mp3",
        "page": "https://science.nasa.gov/resource/listen-to-nasas-ingenuity-mars-helicopter-in-flight-2/",
        "title": "Listen to NASA's Ingenuity Mars Helicopter in Flight",
        "released": "2021-05-07",
        "recorded": "2021-04-30",
        "credit": "NASA/JPL-Caltech/LANL/CNES/CNRS/ISAE-Supaéro",
        "kbps": 32,
        "rate": 22050,
    },
    {
        "id": "insight-quake",
        "url": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia25/pia25281/PIA25281.mp4",
        "page": "https://photojournal.jpl.nasa.gov/catalog/PIA25281",
        "title": "Seismogram and Sonification of InSight's Big Martian Quake (PIA25281)",
        "released": "2022-05-17",
        "recorded": "2022-05-04",
        "credit": "NASA/JPL-Caltech/CNES",
        "kbps": 48,
        "rate": 44100,
    },
    {
        "id": "voyager-plasma",
        "url": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia17/pia17045/PIA17045_20130906-640.mp4",
        "page": "https://photojournal.jpl.nasa.gov/catalog/PIA17045",
        "title": "Voyager Captures Sounds of Interstellar Space (PIA17045)",
        "released": "2013-09-12",
        "recorded": "2012-10 to 2013-05",
        "credit": "NASA/JPL-Caltech/University of Iowa",
        "kbps": 48,
        "rate": 44100,
    },
]


def fetch(url: str) -> Path:
    path = CACHE / url.rsplit("/", 1)[1]
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(net.get(url, timeout=300))
        time.sleep(0.5)
    return path


def decode(path: Path, rate: int = 8000) -> np.ndarray:
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    raw = subprocess.run(
        [exe, "-v", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", str(rate), "-f", "s16le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768.0


def peaks(samples: np.ndarray, bars: int) -> list[float]:
    edges = np.linspace(0, len(samples), bars + 1).astype(int)
    top = np.array([np.abs(samples[a:b]).max() if b > a else 0.0 for a, b in zip(edges, edges[1:])])
    scale = top.max() or 1.0
    return [round(float(v / scale), 3) for v in top]


def build(site_public: Path, data_out: Path) -> list[dict]:
    out_dir = site_public / "audio"
    out_dir.mkdir(parents=True, exist_ok=True)
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    meta = []
    for clip in CLIPS:
        src = fetch(clip["url"])
        dest = out_dir / f"{clip['id']}.mp3"
        subprocess.run(
            [exe, "-v", "error", "-y", "-i", str(src), "-vn", "-ac", "1", "-ar", str(clip["rate"]),
             "-c:a", "libmp3lame", "-b:a", f"{clip['kbps']}k", "-map_metadata", "-1", str(dest)],
            check=True,
        )
        samples = decode(dest)
        meta.append({
            "id": clip["id"],
            "file": f"audio/{clip['id']}.mp3",
            "title": clip["title"],
            "page": clip["page"],
            "source": clip["url"],
            "released": clip["released"],
            "recorded": clip["recorded"],
            "credit": clip["credit"],
            "duration_s": round(len(samples) / 8000, 2),
            "bytes": dest.stat().st_size,
            "excerpt": False,
            "peaks": peaks(samples, BARS),
        })
    data_out.parent.mkdir(parents=True, exist_ok=True)
    data_out.write_text(json.dumps(meta, separators=(",", ":")))
    return meta


if __name__ == "__main__":
    for item in build(SITE / "public", SITE / "src" / "data" / "sounds.json"):
        print(f"{item['file']} {item['duration_s']} s {item['bytes'] / 1024:.0f} KB")
