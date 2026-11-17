#!/usr/bin/env python3
"""
cryptofetch - Historical Cryptocurrency Data Downloader
Description: Interactive CLI tool to fetch historical OHLCV data from Binance, OKX, Coinbase, Bitget or Gate public APIs
"""

import time
import requests
import csv
import os
import re
import sys
from datetime import datetime
from datetime import datetime, timezone
from tqdm import tqdm

BASE = "https://data-api.binance.vision/api/v3/klines"
BASE_FALLBACK = "https://api.binance.com/api/v3/klines"
LIMIT = 1000

INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"]

# Interval to filename mapping to avoid conflicts (1m vs 1M)
INTERVAL_FILENAMES = {
    "1m": "1min",
    "3m": "3min",
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "1h": "1h",
    "2h": "2h",
    "4h": "4h",
    "6h": "6h",
    "8h": "8h",
    "12h": "12h",
    "1d": "1d",
    "3d": "3d",
    "1w": "1w",
    "1M": "1month"
}


# --------------------------------------------------------------------------
# Exchanges
#
# Every exchange is read from its public, key-less market data API and turned
# into ONE row layout (the 12 Binance kline columns). Fields an exchange does
# not provide are left empty.
# --------------------------------------------------------------------------
CSV_HEADER = [
    "open_time_ms", "open", "high", "low", "close", "volume",
    "close_time_ms", "quote_asset_volume", "number_of_trades",
    "taker_buy_base_asset_volume", "taker_buy_quote_asset_volume", "ignore"
]

INTERVAL_MS = {
    "1m": 60_000, "3m": 180_000, "5m": 300_000, "15m": 900_000, "30m": 1_800_000,
    "1h": 3_600_000, "2h": 7_200_000, "4h": 14_400_000, "6h": 21_600_000, "8h": 28_800_000,
    "12h": 43_200_000, "1d": 86_400_000, "3d": 259_200_000, "1w": 604_800_000,
}

QUOTES = ["USDT", "USDC", "FDUSD", "BUSD", "TUSD", "DAI", "USD", "EUR", "GBP", "TRY", "BRL", "BTC", "ETH", "BNB"]


def parse_pair(text, default_quote):
    """Split BTC, BTCUSDT, BTC-USDT, BTC_USDT or BTC/USDT into (base, quote)."""
    s = text.strip().upper()
    if not s:
        return None
    parts = [p for p in re.split(r"[-_/ ]+", s) if p]
    if len(parts) == 2:
        return parts[0], parts[1]
    if len(parts) != 1:
        return None
    word = parts[0]
    for q in QUOTES:
        if len(word) > len(q) and word.endswith(q):
            return word[:-len(q)], q
    return word, default_quote


def get_json(url, params=None, tries=4, timeout=30):
    """GET JSON with retries on rate limits / server errors. Returns None on other 4xx (bad symbol)."""
    last_err = None
    for i in range(tries):
        try:
            r = requests.get(url, params=params, timeout=timeout)
        except requests.RequestException as e:
            last_err = e
            time.sleep(0.8 * (i + 1))
            continue
        if r.status_code == 200:
            return r.json()
        if r.status_code == 429 or r.status_code >= 500:
            last_err = RuntimeError(f"HTTP {r.status_code}")
            time.sleep(1.0 * (i + 1))
            continue
        return None
    raise RuntimeError(f"Exchange kept failing: {last_err}")


def close_ms(open_ms, interval):
    return open_ms + INTERVAL_MS[interval] - 1 if interval in INTERVAL_MS else ""


def finish(rows, start_ms, end_ms):
    seen, out = set(), []
    for r in rows:
        t = int(r[0])
        if t < start_ms or t > end_ms or t in seen:
            continue
        seen.add(t)
        out.append(r)
    out.sort(key=lambda r: int(r[0]))
    return out


class Exchange:
    id = ""
    name = ""
    default_quote = "USDT"
    intervals = list(INTERVALS)
    note = ""

    def symbol(self, base, quote):
        return f"{base}{quote}"

    def earliest_ms(self, interval):
        return None

    def ticker(self, base, quote):
        raise NotImplementedError

    def candles(self, base, quote, interval, start_ms, end_ms, progress):
        """Return normalized rows (oldest first). progress(fraction 0..1) is called per page."""
        raise NotImplementedError


class Binance(Exchange):
    id, name = "binance", "Binance"
    BASES = ["https://data-api.binance.vision", "https://api.binance.com"]

    def _get(self, path, params):
        for base in self.BASES:
            try:
                r = requests.get(base + path, params=params, timeout=30)
            except requests.RequestException:
                continue
            if r.status_code == 451 or (r.status_code == 400 and "restricted location" in r.text.lower()):
                continue  # fall back to the next endpoint
            if r.status_code == 200:
                return r.json()
            if r.status_code in (418, 429) or r.status_code >= 500:
                time.sleep(1)
                continue
            return None
        return None

    def ticker(self, base, quote):
        return self._get("/api/v3/ticker/24hr", {"symbol": f"{base}{quote}"}) is not None

    def candles(self, base, quote, interval, start_ms, end_ms, progress):
        rows, cur = [], start_ms
        while cur < end_ms:
            data = None
            for attempt in range(4):
                data = self._get("/api/v3/klines", {
                    "symbol": f"{base}{quote}", "interval": interval,
                    "startTime": cur, "endTime": end_ms, "limit": 1000})
                if data is not None:
                    break
                time.sleep(1 + attempt)
            if data is None:
                raise RuntimeError(f"Binance rejected {base}{quote} {interval}")
            if not data:
                break
            rows.extend(r[:12] for r in data)
            last = data[-1][0]
            progress((last - start_ms) / max(1, end_ms - start_ms))
            if last >= end_ms:
                break
            cur = last + 1
            time.sleep(0.2)
        return finish(rows, start_ms, end_ms)


class OKX(Exchange):
    id, name = "okx", "OKX"
    # "utc" bars so daily/weekly/monthly candles open at 00:00 UTC like Binance
    BAR = {"1m": "1m", "3m": "3m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1H", "2h": "2H", "4h": "4H",
           "6h": "6Hutc", "12h": "12Hutc", "1d": "1Dutc", "3d": "3Dutc", "1w": "1Wutc", "1M": "1Mutc"}
    intervals = list(BAR)

    def symbol(self, base, quote):
        return f"{base}-{quote}"

    def ticker(self, base, quote):
        d = get_json("https://www.okx.com/api/v5/market/ticker", {"instId": f"{base}-{quote}"}, tries=1)
        return bool(d and d.get("data"))

    def candles(self, base, quote, interval, start_ms, end_ms, progress):
        rows, after = [], end_ms + 1  # returns candles older than `after`, newest first, 100 per page
        while True:
            d = get_json("https://www.okx.com/api/v5/market/history-candles",
                         {"instId": f"{base}-{quote}", "bar": self.BAR[interval], "after": after, "limit": 100})
            if not d or d.get("code") != "0":
                raise RuntimeError(f"OKX rejected {base}-{quote} {interval}")
            page = d["data"]
            if not page:
                break
            for r in page:
                t = int(r[0])
                rows.append([t, r[1], r[2], r[3], r[4], r[5], close_ms(t, interval), r[7], "", "", "", 0])
            oldest = int(page[-1][0])
            progress((end_ms - oldest) / max(1, end_ms - start_ms))
            if oldest <= start_ms:
                break
            after = oldest
            time.sleep(0.12)  # public limit: 20 requests / 2s
        return finish(rows, start_ms, end_ms)


class Coinbase(Exchange):
    id, name, default_quote = "coinbase", "Coinbase", "USD"
    GRAN = {"1m": 60, "5m": 300, "15m": 900, "1h": 3600, "6h": 21600, "1d": 86400}
    intervals = list(GRAN)
    note = "Coinbase offers 1m, 5m, 15m, 1h, 6h and 1d candles. Pairs are mostly quoted in USD."

    def symbol(self, base, quote):
        return f"{base}-{quote}"

    def ticker(self, base, quote):
        return get_json(f"https://api.exchange.coinbase.com/products/{base}-{quote}/ticker", tries=1) is not None

    def candles(self, base, quote, interval, start_ms, end_ms, progress):
        rows = []
        g = self.GRAN[interval] * 1000
        step = g * 300  # max 300 candles per request
        cur = start_ms
        while cur <= end_ms:
            to = min(cur + step - g, end_ms)
            iso = lambda ms: datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            d = get_json(f"https://api.exchange.coinbase.com/products/{base}-{quote}/candles",
                         {"granularity": self.GRAN[interval], "start": iso(cur), "end": iso(to)})
            if d is None:
                raise RuntimeError(f"Coinbase rejected {base}-{quote} {interval}")
            for r in d:  # [time(s), low, high, open, close, volume]
                t = int(r[0]) * 1000
                rows.append([t, r[3], r[2], r[1], r[4], r[5], close_ms(t, interval), "", "", "", "", 0])
            progress((to - start_ms) / max(1, end_ms - start_ms))
            cur += step
            time.sleep(0.15)  # public limit: 10 requests / s
        return finish(rows, start_ms, end_ms)


class Bitget(Exchange):
    id, name = "bitget", "Bitget"
    GRAN = {"1m": "1min", "3m": "3min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "1h", "4h": "4h",
            "6h": "6Hutc", "12h": "12Hutc", "1d": "1Dutc", "3d": "3Dutc", "1w": "1Wutc", "1M": "1Mutc"}
    intervals = list(GRAN)

    def ticker(self, base, quote):
        d = get_json("https://api.bitget.com/api/v2/spot/market/tickers", {"symbol": f"{base}{quote}"}, tries=1)
        return bool(d and d.get("code") == "00000" and d.get("data"))

    def candles(self, base, quote, interval, start_ms, end_ms, progress):
        rows = []
        # endTime is compared with candle CLOSE time; returns the newest `limit` candles closing by then
        end = end_ms + INTERVAL_MS.get(interval, 31 * 86_400_000)
        while True:
            d = get_json("https://api.bitget.com/api/v2/spot/market/history-candles",
                         {"symbol": f"{base}{quote}", "granularity": self.GRAN[interval], "endTime": end, "limit": 200})
            if not d or d.get("code") != "00000":
                raise RuntimeError(f"Bitget rejected {base}{quote} {interval}")
            page = d["data"]
            if not page:
                break
            for r in page:
                t = int(r[0])
                rows.append([t, r[1], r[2], r[3], r[4], r[5], close_ms(t, interval), r[6], "", "", "", 0])
            oldest = min(int(r[0]) for r in page)
            progress((end_ms - oldest) / max(1, end_ms - start_ms))
            if oldest <= start_ms or len(page) < 200:
                break
            end = oldest
            time.sleep(0.1)
        return finish(rows, start_ms, end_ms)


class Gate(Exchange):
    id, name = "gate", "Gate"
    INT = {"1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1h", "4h": "4h", "8h": "8h", "1d": "1d", "1w": "7d"}
    intervals = list(INT)
    note = "Gate only serves the latest 10,000 candles per interval, so older start dates are trimmed."

    def symbol(self, base, quote):
        return f"{base}_{quote}"

    def earliest_ms(self, interval):
        return int(time.time() * 1000) - 9_990 * INTERVAL_MS[interval]

    def ticker(self, base, quote):
        return bool(get_json("https://api.gateio.ws/api/v4/spot/tickers", {"currency_pair": f"{base}_{quote}"}, tries=1))

    def candles(self, base, quote, interval, start_ms, end_ms, progress):
        rows = []
        iv = INTERVAL_MS[interval]
        step = iv * 999  # max 1000 candles per request
        start_ms = max(start_ms, self.earliest_ms(interval))
        cur = start_ms
        while cur <= end_ms:
            to = min(cur + step, end_ms)
            d = get_json("https://api.gateio.ws/api/v4/spot/candlesticks",
                         {"currency_pair": f"{base}_{quote}", "interval": self.INT[interval],
                          "from": cur // 1000, "to": to // 1000})
            if not isinstance(d, list):
                raise RuntimeError(f"Gate rejected {base}_{quote} {interval}")
            for r in d:  # [time, quote vol, close, high, low, open, base vol, closed]
                t = int(r[0]) * 1000
                rows.append([t, r[5], r[3], r[4], r[2], r[6], close_ms(t, interval), r[1], "", "", "", 0])
            progress((to - start_ms) / max(1, end_ms - start_ms))
            cur += step + iv
            time.sleep(0.1)
        return finish(rows, start_ms, end_ms)


EXCHANGES = [Binance(), OKX(), Coinbase(), Bitget(), Gate()]


def get_exchange(key):
    key = key.strip().lower()
    for ex in EXCHANGES:
        if key in (ex.id, ex.name.lower()):
            return ex
    return None


# ANSI color codes
class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    MAGENTA = '\033[95m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    RESET = '\033[0m'


def print_banner():
    """Display the CryptoFetch banner"""
    cyan = Colors.CYAN
    green = Colors.GREEN
    yellow = Colors.YELLOW
    bold = Colors.BOLD
    reset = Colors.RESET
    
    print(f"{cyan}{bold}")
    print("    ╔═════════════════════════════════════════════════════════════╗")
    print("    ║                                                             ║")
    print("    ║   ██████╗██████╗ ██╗   ██╗██████╗ ████████╗ ██████╗         ║")
    print("    ║  ██╔════╝██╔══██╗╚██╗ ██╔╝██╔══██╗╚══██╔══╝██╔═══██╗        ║")
    print("    ║  ██║     ██████╔╝ ╚████╔╝ ██████╔╝   ██║   ██║   ██║        ║")
    print("    ║  ██║     ██╔══██╗  ╚██╔╝  ██╔═══╝    ██║   ██║   ██║        ║")
    print("    ║  ╚██████╗██║  ██║   ██║   ██║        ██║   ╚██████╔╝        ║")
    print("    ║   ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝        ╚═╝    ╚═════╝         ║")
    print("    ║                                                             ║")
    print("    ║  ███████╗███████╗████████╗ ██████╗██╗  ██╗                  ║")
    print("    ║  ██╔════╝██╔════╝╚══██╔══╝██╔════╝██║  ██║                  ║")
    print("    ║  █████╗  █████╗     ██║   ██║     ███████║                  ║")
    print("    ║  ██╔══╝  ██╔══╝     ██║   ██║     ██╔══██║                  ║")
    print("    ║  ██║     ███████╗   ██║   ╚██████╗██║  ██║                  ║")
    print("    ║  ╚═╝     ╚══════╝   ╚═╝    ╚═════╝╚═╝  ╚═╝                  ║")
    print("    ║                                                             ║")
    print("    ║        Historical Crypto Data Downloader                    ║")
    print("    ║                                                             ║")
    print("    ║                                                             ║")
    print(f"    ║        {yellow}[>] github.com/varshithkarkera{cyan}                       ║")
    print("    ║                                                             ║")
    print("    ╚═════════════════════════════════════════════════════════════╝")
    print(reset)


def verify_symbol(ex, base, quote):
    """Check that the pair exists on the chosen exchange"""
    try:
        return bool(ex.ticker(base, quote))
    except Exception:
        return False


def validate_date(date_str):
    """Validate date format YYYY-MM-DD"""
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def fetch_klines(ex, base, quote, interval, start_date, end_date, output_file):
    """Fetch historical candles from the chosen exchange and save them as CSV"""
    start_ts = int(datetime.strptime(start_date, "%Y-%m-%d").timestamp() * 1000)
    end_ts = int(datetime.strptime(end_date, "%Y-%m-%d").timestamp() * 1000)
    symbol = ex.symbol(base, quote)

    print(f"\n{Colors.MAGENTA}[*] Fetching {symbol} {interval} from {ex.name} ({start_date} to {end_date}){Colors.RESET}")

    earliest = ex.earliest_ms(interval)
    if earliest and start_ts < earliest:
        shown = datetime.fromtimestamp(earliest / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
        print(f"{Colors.YELLOW}[!] {ex.name} only has {interval} candles from {shown}; starting there.{Colors.RESET}")

    with tqdm(total=100, desc=f"{symbol} {interval}", unit="%", bar_format='{l_bar}{bar}| {n:.1f}%') as pbar:
        state = {"last": 0.0}

        def progress(fraction):
            pct = max(0.0, min(1.0, fraction)) * 100
            if pct > state["last"]:
                pbar.update(pct - state["last"])
                state["last"] = pct

        try:
            rows = ex.candles(base, quote, interval, start_ts, end_ts, progress)
        except Exception as e:
            tqdm.write(f"{Colors.RED}[!] Error: {e}{Colors.RESET}")
            return 0
        pbar.update(100 - state["last"])

    if not rows:
        print(f"{Colors.YELLOW}[!] No {interval} data returned for {symbol} on {ex.name}. Nothing saved.{Colors.RESET}")
        return 0

    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(output_file) or ".", exist_ok=True)

    # Write to CSV
    with open(output_file, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(CSV_HEADER)
        writer.writerows(rows)

    print(f"{Colors.GREEN}[+] Saved {len(rows)} candles to {output_file}{Colors.RESET}")
    return len(rows)


def choose_exchange(preselected=None):
    """Ask which exchange to use (Binance is the default)"""
    if preselected:
        ex = get_exchange(preselected)
        if ex:
            return ex
        names = ", ".join(e.id for e in EXCHANGES)
        print(f"{Colors.RED}[!] Unknown exchange '{preselected}'. Choose one of: {names}{Colors.RESET}")
        return None

    print(f"\n{Colors.CYAN}[>] Select exchange (default: 1):{Colors.RESET}\n")
    for i, ex in enumerate(EXCHANGES, 1):
        print(f"  {Colors.YELLOW}{i:2d}.{Colors.RESET} {ex.name}")
    while True:
        choice = input(f"{Colors.YELLOW}>>> {Colors.RESET}").strip()
        if not choice:
            return EXCHANGES[0]
        if choice.isdigit() and 1 <= int(choice) <= len(EXCHANGES):
            return EXCHANGES[int(choice) - 1]
        ex = get_exchange(choice)
        if ex:
            return ex
        print(f"{Colors.RED}[!] Invalid choice.{Colors.RESET}")


def interactive_mode(exchange_arg=None):
    """Run the tool in interactive mode"""
    print_banner()

    ex = choose_exchange(exchange_arg)
    if ex is None:
        return
    if ex.note:
        print(f"{Colors.YELLOW}[*] {ex.note}{Colors.RESET}")

    # Get symbol with verification
    ex_examples = ", ".join(ex.symbol(b, ex.default_quote) for b in ("BTC", "ETH", "SOL"))
    while True:
        print(f"\n{Colors.CYAN}[>] Enter cryptocurrency symbol (e.g., {ex_examples}, or just BTC):{Colors.RESET}")
        symbol_input = input(f"{Colors.YELLOW}>>> {Colors.RESET}").strip().upper()

        if not symbol_input:
            print(f"{Colors.RED}[!] No symbol entered. Exiting.{Colors.RESET}")
            return

        pair = parse_pair(symbol_input, ex.default_quote)
        print(f"{Colors.YELLOW}[*] Verifying symbol...{Colors.RESET}")
        if pair and verify_symbol(ex, *pair):
            base, quote = pair
            symbol = ex.symbol(base, quote)
            print(f"{Colors.GREEN}[+] Symbol verified on {ex.name}: {symbol}{Colors.RESET}")
            break
        else:
            print(f"{Colors.RED}[!] Invalid symbol '{symbol_input}' for {ex.name}.{Colors.RESET}")
            print(f"{Colors.YELLOW}[*] Examples: {ex_examples}{Colors.RESET}")

    # Get intervals
    intervals = ex.intervals
    print(f"\n{Colors.CYAN}[>] Available intervals on {ex.name}:{Colors.RESET}\n")
    for i, interval in enumerate(intervals, 1):
        print(f"  {Colors.YELLOW}{i:2d}.{Colors.RESET} {interval}")

    print(f"\n{Colors.CYAN}[>] Select intervals (comma-separated, e.g., 1,4,6 or 'all'):{Colors.RESET}")
    interval_choice = input(f"{Colors.YELLOW}>>> {Colors.RESET}").strip()

    if interval_choice.lower() == "all":
        selected_intervals = list(intervals)
    else:
        try:
            indices = [int(x.strip()) - 1 for x in interval_choice.split(",")]
            if any(i < 0 for i in indices):
                raise IndexError
            selected_intervals = [intervals[i] for i in indices]
        except (ValueError, IndexError):
            print(f"{Colors.RED}[!] Invalid selection. Exiting.{Colors.RESET}")
            return

    # Get date range
    print(f"\n{Colors.CYAN}[>] Start date (YYYY-MM-DD):{Colors.RESET}")
    while True:
        start_date = input(f"{Colors.YELLOW}>>> {Colors.RESET}").strip()
        if validate_date(start_date):
            break
        print(f"{Colors.RED}[!] Invalid date format!{Colors.RESET}")
    
    print(f"\n{Colors.CYAN}[>] End date (YYYY-MM-DD):{Colors.RESET}")
    while True:
        end_date = input(f"{Colors.YELLOW}>>> {Colors.RESET}").strip()
        if validate_date(end_date):
            break
        print(f"{Colors.RED}[!] Invalid date format!{Colors.RESET}")
    
    # Get output directory
    default_dir = base.lower()
    print(f"\n{Colors.CYAN}[>] Output directory (default: {default_dir}/):{Colors.RESET}")
    output_dir = input(f"{Colors.YELLOW}>>> {Colors.RESET}").strip() or default_dir
    
    # Confirm
    separator = "=" * 65
    print(f"\n{Colors.BOLD}{separator}{Colors.RESET}")
    print(f"{Colors.GREEN}[+] DOWNLOAD SUMMARY{Colors.RESET}")
    print(f"{Colors.BOLD}{separator}{Colors.RESET}")
    print(f"  {Colors.CYAN}Exchange:{Colors.RESET}    {ex.name}")
    print(f"  {Colors.CYAN}Symbol:{Colors.RESET}      {symbol}")
    print(f"  {Colors.CYAN}Intervals:{Colors.RESET}  {', '.join(selected_intervals)}")
    print(f"  {Colors.CYAN}Date Range:{Colors.RESET} {start_date} to {end_date}")
    print(f"  {Colors.CYAN}Output:{Colors.RESET}     {output_dir}/")
    print(f"{Colors.BOLD}{separator}{Colors.RESET}")
    
    print(f"\n{Colors.YELLOW}[?] Start download? (y/n) [default: y]:{Colors.RESET}")
    confirm = input(f"{Colors.YELLOW}>>> {Colors.RESET}").strip().lower()
    if confirm and confirm != 'y':
        print(f"{Colors.RED}[!] Cancelled.{Colors.RESET}")
        return
    
    # Download
    print(f"\n{Colors.GREEN}[+] Starting download...{Colors.RESET}\n")
    total_candles = 0
    fetched_at = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    
    for interval in selected_intervals:
        filename_interval = INTERVAL_FILENAMES[interval]
        # Binance files keep their original names; other exchanges are prefixed
        prefix = "" if ex.id == "binance" else f"{ex.id}_"
        filename = f"{output_dir}/{prefix}{symbol.lower()}_{filename_interval}_fetched_{fetched_at}.csv"
        candles = fetch_klines(ex, base, quote, interval, start_date, end_date, filename)
        total_candles += candles
    
    print(f"\n{Colors.BOLD}{separator}{Colors.RESET}")
    print(f"{Colors.GREEN}[+] Download complete! Total candles: {total_candles:,}{Colors.RESET}")
    print(f"{Colors.BOLD}{separator}{Colors.RESET}")


if __name__ == "__main__":
    # Optional: python cryptofetch.py --exchange okx   (binance, okx, coinbase, bitget, gate)
    exchange_arg = None
    if len(sys.argv) >= 3 and sys.argv[1] in ("--exchange", "-e"):
        exchange_arg = sys.argv[2]
    interactive_mode(exchange_arg)


