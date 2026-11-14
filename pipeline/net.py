"""HTTPS GET with the certifi CA bundle and a clear User-Agent."""

from __future__ import annotations

import ssl
import urllib.request

import certifi

_CTX = ssl.create_default_context(cafile=certifi.where())
AGENT = "hullo-pipeline/1.0 (NASA Space Apps Challenge 2026 entry; +https://github.com/HHS-EC-Demons/hullo)"


def get(url: str, timeout: int = 300) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": AGENT})
    with urllib.request.urlopen(req, timeout=timeout, context=_CTX) as resp:
        return resp.read()
