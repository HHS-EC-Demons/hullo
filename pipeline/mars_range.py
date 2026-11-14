"""Daily one way light time from Earth to Mars for 2026 and 2027.

JPL Horizons observer table for Mars (499) seen from Earth's center
(500@399), quantity 21, the one way down leg light time in minutes, at
00:00 UT each day. Writes site/public/data/mars-light.json.
"""

from __future__ import annotations

import json
from pathlib import Path

import horizons

OUT = Path(__file__).resolve().parents[1] / "site" / "public" / "data" / "mars-light.json"


def main() -> None:
    result = horizons.query(
        {
            "COMMAND": "499",
            "EPHEM_TYPE": "OBSERVER",
            "CENTER": "500@399",
            "START_TIME": "2026-01-01",
            "STOP_TIME": "2028-01-01",
            "STEP_SIZE": "1 d",
            "QUANTITIES": "21",
            "CSV_FORMAT": "YES",
        }
    )
    minutes = []
    for fields in horizons.rows(result):
        minutes.append(round(float(fields[-1]), 3))
    data = {
        "source": "JPL Horizons observer table, Mars (499) from Earth's center (500@399), quantity 21, one way light time, daily at 00:00 UT",
        "start": "2026-01-01",
        "step_days": 1,
        "minutes": minutes,
    }
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    print(f"{len(minutes)} days, {min(minutes)} to {max(minutes)} min")


if __name__ == "__main__":
    main()
