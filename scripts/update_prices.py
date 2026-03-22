#!/usr/bin/env python3
"""
Fetch current Brent crude oil and TTF natural gas prices.
Writes results to prices.json in the repo root.

Used by GitHub Actions to keep prices.json up to date.
Falls back gracefully if any source is unavailable.
"""

import json
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

PRICES_FILE = Path(__file__).parent.parent / "prices.json"

# Pre-crisis baselines (fixed)
PRE_CRISIS_BRENT = 68
PRE_CRISIS_TTF = 36
PEAK_BRENT = 126


def fetch_yahoo_quote(symbol):
    """Fetch latest price from Yahoo Finance v8 API."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d"
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; HormuzSimulator/1.0)"
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            meta = data["chart"]["result"][0]["meta"]
            return round(meta["regularMarketPrice"], 2)
    except (urllib.error.URLError, KeyError, IndexError, json.JSONDecodeError) as e:
        print(f"  Yahoo Finance failed for {symbol}: {e}")
        return None


def fetch_brent():
    """Fetch Brent crude oil price ($/bbl)."""
    print("Fetching Brent (BZ=F)...")
    price = fetch_yahoo_quote("BZ=F")
    if price:
        print(f"  Brent: ${price}/bbl")
    return price


def fetch_ttf():
    """Fetch TTF natural gas price (EUR/MWh)."""
    print("Fetching TTF (TTF=F)...")
    price = fetch_yahoo_quote("TTF=F")
    if price:
        print(f"  TTF: {price} EUR/MWh")
        return price

    # Fallback: try Dutch TTF via different symbol
    print("  Trying fallback TFM=F...")
    price = fetch_yahoo_quote("TFM=F")
    if price:
        print(f"  TTF (fallback): {price} EUR/MWh")
    return price


def main():
    # Load existing prices as fallback
    try:
        existing = json.loads(PRICES_FILE.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        existing = {}

    brent = fetch_brent()
    ttf = fetch_ttf()

    prices = {
        "brent": brent if brent else existing.get("brent", 112),
        "ttf": ttf if ttf else existing.get("ttf", 60),
        "preCrisisBrent": PRE_CRISIS_BRENT,
        "preCrisisTTF": PRE_CRISIS_TTF,
        "peakBrent": PEAK_BRENT,
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "yahoo_finance" if (brent or ttf) else existing.get("source", "manual"),
    }

    PRICES_FILE.write_text(json.dumps(prices, indent=2) + "\n")
    print(f"\nWritten to {PRICES_FILE}:")
    print(json.dumps(prices, indent=2))

    # Exit with error only if BOTH failed (so GitHub Action shows warning)
    if not brent and not ttf:
        print("\nWARNING: Both price sources failed, kept previous values.")
        return 1
    return 0


if __name__ == "__main__":
    exit(main())
