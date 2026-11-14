"""Hourly laser ranging table from two lunar laser ranging stations to the
lunar retroreflectors.

Horizons gives, for every hour, the apparent range from the station to the
reflector's surface point (km), its rate (km/s) and the reflector's
elevation above the station's horizon. The site turns range into a round
trip time as 2 * range / c and interpolates between hours with the rate.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

import horizons

C_KM_S = 299792.458
START = "2026-01-01 00:00"
STOP = "2028-01-01 00:00"
MONTHS = {m: i + 1 for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}

REFLECTORS = [
    {"id": "a11", "name": "Apollo 11", "lat": 0.67345, "lon": 23.47307, "nasa": True,
     "placed": "1969-07-21", "source": "nssdca-lunar-sites"},
    {"id": "a14", "name": "Apollo 14", "lat": -3.64417, "lon": -17.47865, "nasa": True,
     "placed": "1971-02-05", "source": "nssdca-lunar-sites"},
    {"id": "a15", "name": "Apollo 15", "lat": 26.13341, "lon": 3.62850, "nasa": True,
     "placed": "1971-07-31", "source": "nssdca-lunar-sites"},
    {"id": "l1", "name": "Lunokhod 1", "lat": 38.3150, "lon": -35.0081, "nasa": False,
     "placed": "1970-11-17", "source": "nssdca-artifacts"},
    {"id": "l2", "name": "Lunokhod 2", "lat": 25.8323, "lon": 30.9222, "nasa": False,
     "placed": "1973-01-15", "source": "nssdca-artifacts"},
]

STATIONS = [
    {"id": "apache", "name": "Apache Point", "place": "New Mexico, USA", "code": "705",
     "laser": "APOLLO"},
    {"id": "grasse", "name": "Grasse", "place": "France", "code": "010", "laser": "MeO"},
]


def ranging(station: dict, reflector: dict) -> tuple[list[datetime], list[float], list[float], list[float], dict]:
    lon = reflector["lon"] % 360.0
    result = horizons.query({
        "COMMAND": f"g: {lon:.5f}, {reflector['lat']:.5f}, 0 @301",
        "EPHEM_TYPE": "OBSERVER",
        "CENTER": f"{station['code']}@399",
        "START_TIME": START,
        "STOP_TIME": STOP,
        "STEP_SIZE": "1 h",
        "QUANTITIES": "4,20",
        "TIME_TYPE": "UT",
        "CSV_FORMAT": "YES",
        "RANGE_UNITS": "KM",
        "EXTRA_PREC": "YES",
        "ANG_FORMAT": "DEG",
    })
    times, el, rng, rate = [], [], [], []
    for r in horizons.rows(result):
        date, hm = r[0].split(" ")
        y, mon, d = date.split("-")
        hh, mm = hm.split(":")
        times.append(datetime(int(y), MONTHS[mon], int(d), int(hh), int(mm), tzinfo=timezone.utc))
        el.append(float(r[6]))
        rng.append(float(r[7]))
        rate.append(float(r[8]))
    meta = {
        "center_site": horizons.header_value(result, "Center-site name"),
        "center_geodetic": horizons.header_value(result, "Center geodetic"),
        "target_pole": horizons.header_value(result, "Target pole/equ"),
    }
    return times, el, rng, rate, meta


def build(out_dir) -> dict:
    """Write one JSON file per month and return the index."""
    out_dir.mkdir(parents=True, exist_ok=True)
    sites = {}
    rt_min, rt_max = 1e9, 0.0
    times: list[datetime] = []
    elevation: dict[str, list[float]] = {}
    series: dict[tuple[str, str], tuple[list[int], list[int]]] = {}
    for st in STATIONS:
        for rf in REFLECTORS:
            times, el, rng, rate, meta = ranging(st, rf)
            sites[st["id"]] = meta
            series[(st["id"], rf["id"])] = (
                [round(r * 1000.0) for r in rng],
                [round(v * 1e6) for v in rate],
            )
            if rf["id"] == "a11":
                elevation[st["id"]] = [round(e, 1) for e in el]
            for e, r in zip(el, rng):
                if e >= 20:
                    rt = 2 * r / C_KM_S
                    rt_min, rt_max = min(rt_min, rt), max(rt_max, rt)
    starts: dict[str, int] = {}
    for i, t in enumerate(times):
        starts.setdefault(t.strftime("%Y-%m"), i)
    names = sorted(k for k, i in starts.items() if i < len(times) - 1)
    for n, key in enumerate(names):
        a = starts[key]
        b = starts[names[n + 1]] if n + 1 < len(names) else len(times) - 1
        stations = {}
        for st in STATIONS:
            refl = {}
            for rf in REFLECTORS:
                r_m, rr = series[(st["id"], rf["id"])]
                refl[rf["id"]] = {"r_m": r_m[a:b + 1], "rr_mm_s": rr[a:b + 1]}
            stations[st["id"]] = {"el": elevation[st["id"]][a:b + 1], "refl": refl}
        payload = {"step_s": 3600, "start_utc": times[a].strftime("%Y-%m-%dT%H:%M:%SZ"), "stations": stations}
        (out_dir / f"{key}.json").write_text(json.dumps(payload, separators=(",", ":")))
    return {
        "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "source": "JPL Horizons API, OBSERVER tables, quantities 4 and 20, target pole MEAN_ME",
        "c_km_s": C_KM_S,
        "months": names,
        "min_elevation_deg": 20,
        "round_trip_s": {"min": round(rt_min, 4), "max": round(rt_max, 4)},
        "reflectors": REFLECTORS,
        "stations": [{**st, **sites.get(st["id"], {})} for st in STATIONS],
    }


def fixtures() -> dict:
    """Off-grid Horizons ranges used by the site's tests."""
    checks = [
        ("apache", "a15", "2026-11-20 03:17"),
        ("apache", "a11", "2027-02-11 05:41"),
        ("grasse", "a14", "2026-12-03 22:08"),
        ("grasse", "l2", "2027-05-19 01:52"),
    ]
    st_by = {s["id"]: s for s in STATIONS}
    rf_by = {r["id"]: r for r in REFLECTORS}
    out = []
    for sid, rid, utc in checks:
        st, rf = st_by[sid], rf_by[rid]
        lon = rf["lon"] % 360.0
        result = horizons.query({
            "COMMAND": f"g: {lon:.5f}, {rf['lat']:.5f}, 0 @301",
            "EPHEM_TYPE": "OBSERVER",
            "CENTER": f"{st['code']}@399",
            "TLIST": utc,
            "TLIST_TYPE": "CAL",
            "QUANTITIES": "4,20",
            "TIME_TYPE": "UT",
            "CSV_FORMAT": "YES",
            "RANGE_UNITS": "KM",
            "EXTRA_PREC": "YES",
            "ANG_FORMAT": "DEG",
        })
        row = horizons.rows(result)[0]
        out.append({
            "station": sid,
            "reflector": rid,
            "utc": utc.replace(" ", "T") + ":00Z",
            "elevation_deg": float(row[6]),
            "range_km": float(row[7]),
            "round_trip_s": 2 * float(row[7]) / C_KM_S,
        })
    return {"source": "JPL Horizons API, OBSERVER, quantities 4 and 20, RANGE_UNITS KM", "checks": out}
