"""Daily light time table for the probes leaving the solar system.

For each probe the table holds, at 00:00 UTC each day:
  rg  geometric distance from Earth's center in km (no light time correction,
      the convention NASA uses for the one light-day milestone)
  rr  rate of change of that distance in km/s
  up  seconds a radio message sent from Earth's center at that instant takes
      to reach the probe, counting the probe's and Earth's motion while the
      message travels
  down  seconds a signal the probe sends at that instant takes to reach
      Earth's center, counting Earth's motion while the signal travels
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import numpy as np

import horizons

C_KM_S = 299792.458
DAY_S = 86400.0
START = "2026-01-01"
STOP = "2028-01-03"

PROBES = [
    ("voyager1", "Voyager 1", "-31"),
    ("voyager2", "Voyager 2", "-32"),
    ("newhorizons", "New Horizons", "-98"),
    ("pioneer10", "Pioneer 10", "-23"),
    ("pioneer11", "Pioneer 11", "-24"),
]


def vectors(command: str, center: str) -> tuple[np.ndarray, np.ndarray, np.ndarray, str]:
    """Daily geometric state vectors (km, km/s) in the ecliptic J2000 frame."""
    result = horizons.query({
        "COMMAND": command,
        "EPHEM_TYPE": "VECTORS",
        "CENTER": center,
        "START_TIME": START,
        "STOP_TIME": STOP,
        "STEP_SIZE": "1 d",
        "VEC_TABLE": "2",
        "VEC_CORR": "NONE",
        "OUT_UNITS": "KM-S",
        "CSV_FORMAT": "YES",
        "TIME_TYPE": "UT",
    })
    table = horizons.rows(result)
    jd = np.array([float(r[0]) for r in table])
    pos = np.array([[float(v) for v in r[2:5]] for r in table])
    vel = np.array([[float(v) for v in r[5:8]] for r in table])
    return jd, pos, vel, horizons.header_value(result, "Target body name")


def hermite(pos: np.ndarray, vel: np.ndarray, t_days: float) -> np.ndarray:
    """Cubic Hermite position at t_days after the first sample (1 day step)."""
    i = int(np.floor(t_days))
    i = min(max(i, 0), len(pos) - 2)
    s = t_days - i
    h00 = 2 * s**3 - 3 * s**2 + 1
    h10 = s**3 - 2 * s**2 + s
    h01 = -2 * s**3 + 3 * s**2
    h11 = s**3 - s**2
    return h00 * pos[i] + h10 * vel[i] * DAY_S + h01 * pos[i + 1] + h11 * vel[i + 1] * DAY_S


def uplink_seconds(p_geo, v_geo, e_ssb, ev_ssb, k: int) -> float:
    """Light time for a message sent from Earth's center at grid time k."""
    tau = np.linalg.norm(p_geo[k]) / C_KM_S
    for _ in range(8):
        t = k + tau / DAY_S
        probe_from_earth_then = hermite(p_geo, v_geo, t) + hermite(e_ssb, ev_ssb, t) - e_ssb[k]
        tau = np.linalg.norm(probe_from_earth_then) / C_KM_S
    return float(tau)


def downlink_seconds(p_geo, e_ssb, ev_ssb, k: int) -> float:
    """Light time for a signal the probe sends at grid time k to reach Earth's center."""
    probe_ssb = p_geo[k] + e_ssb[k]
    tau = np.linalg.norm(p_geo[k]) / C_KM_S
    for _ in range(8):
        t = k + tau / DAY_S
        tau = np.linalg.norm(probe_ssb - hermite(e_ssb, ev_ssb, t)) / C_KM_S
    return float(tau)


def light_day_crossing(jd: np.ndarray, pos: np.ndarray, vel: np.ndarray) -> str | None:
    """UTC instant when the geometric light time first reaches 86400 s."""
    rg = np.linalg.norm(pos, axis=1)
    target = C_KM_S * DAY_S
    above = np.nonzero(rg >= target)[0]
    if len(above) == 0 or above[0] == 0:
        return None
    lo, hi = float(above[0] - 1), float(above[0])
    for _ in range(60):
        mid = (lo + hi) / 2
        if np.linalg.norm(hermite(pos, vel, mid)) >= target:
            hi = mid
        else:
            lo = mid
    instant = jd_to_datetime(jd[0] + hi)
    return instant.strftime("%Y-%m-%dT%H:%M:%S.") + f"{instant.microsecond // 1000:03d}Z"


def jd_to_datetime(jd: float) -> datetime:
    return datetime(2000, 1, 1, 12, tzinfo=timezone.utc) + timedelta(days=jd - 2451545.0)


def build() -> dict:
    jd_e, e_ssb, ev_ssb, _ = vectors("399", "500@0")
    out = {
        "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "source": "JPL Horizons API, geometric state vectors, center 500@399, time type UT",
        "start_utc": START + "T00:00:00Z",
        "start_jd_ut": float(jd_e[0]),
        "step_s": DAY_S,
        "c_km_s": C_KM_S,
        "probes": {},
    }
    for key, name, command in PROBES:
        jd, p, v, target = vectors(command, "500@399")
        assert np.allclose(jd, jd_e), "probe and Earth tables must share epochs"
        rg = np.linalg.norm(p, axis=1)
        rr = np.einsum("ij,ij->i", p, v) / rg
        up = [uplink_seconds(p, v, e_ssb, ev_ssb, k) for k in range(len(jd) - 2)]
        up += [up[-1], up[-1]]
        down = [downlink_seconds(p, e_ssb, ev_ssb, k) for k in range(len(jd) - 2)]
        down += [down[-1], down[-1]]
        out["probes"][key] = {
            "name": name,
            "horizons_id": command,
            "horizons_target": target,
            "rg_km": [round(float(x), 1) for x in rg],
            "rr_km_s": [round(float(x), 5) for x in rr],
            "up_s": [round(float(x), 3) for x in up],
            "down_s": [round(float(x), 3) for x in down],
            "light_day_utc": light_day_crossing(jd, p, v),
        }
    return out


def fixtures() -> dict:
    """Off-grid Horizons light times used by the site's tests."""
    checks = [
        ("voyager1", "-31", "2026-11-18 10:16:07"),
        ("voyager1", "-31", "2026-11-14 17:43:00"),
        ("voyager1", "-31", "2027-03-02 06:05:00"),
        ("voyager2", "-32", "2027-07-09 21:30:00"),
        ("newhorizons", "-98", "2026-12-24 13:13:00"),
        ("pioneer10", "-23", "2026-06-01 08:00:00"),
    ]
    out = []
    for key, command, utc in checks:
        result = horizons.query({
            "COMMAND": command,
            "EPHEM_TYPE": "VECTORS",
            "CENTER": "500@399",
            "TLIST": utc,
            "TLIST_TYPE": "CAL",
            "VEC_TABLE": "3",
            "VEC_CORR": "NONE",
            "OUT_UNITS": "KM-S",
            "CSV_FORMAT": "YES",
            "TIME_TYPE": "UT",
        })
        row = horizons.rows(result)[0]
        out.append({
            "probe": key,
            "utc": utc.replace(" ", "T") + "Z",
            "lt_s": float(row[8]),
            "rg_km": float(row[9]),
            "rr_km_s": float(row[10]),
        })
    return {"source": "JPL Horizons API, VECTORS, VEC_CORR NONE, center 500@399, time type UT", "checks": out}


if __name__ == "__main__":
    print(json.dumps(build()["probes"]["voyager1"]["light_day_utc"]))
