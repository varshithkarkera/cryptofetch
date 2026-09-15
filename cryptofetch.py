#!/usr/bin/env python3
"""
cryptofetch - Historical Cryptocurrency Data Downloader
Description: Interactive CLI tool to fetch historical OHLCV data from Binance API
"""

import time
import requests
import csv
import os
from datetime import datetime
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


def verify_symbol(symbol):
    """Verify if symbol exists on Binance"""
    try:
        # Try data-api.binance.vision first (recommended for public market data)
        url = f"https://data-api.binance.vision/api/v3/ticker/24hr?symbol={symbol}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return True
        
        # Fallback to api.binance.com if data-api fails
        url = f"https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return True
        return False
    except Exception:
        return False


def validate_date(date_str):
    """Validate date format YYYY-MM-DD"""
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def fetch_klines(symbol, interval, start_date, end_date, output_file):
    """Fetch historical klines from Binance API"""
    start_ts = int(datetime.strptime(start_date, "%Y-%m-%d").timestamp() * 1000)
    end_ts = int(datetime.strptime(end_date, "%Y-%m-%d").timestamp() * 1000)
    
    rows = []
    current_start = start_ts
    
    print(f"\n{Colors.MAGENTA}[*] Fetching {symbol} {interval} from {start_date} to {end_date}{Colors.RESET}")
    
    with tqdm(total=100, desc=f"{symbol} {interval}", unit="%", bar_format='{l_bar}{bar}| {n:.1f}%') as pbar:
        last_progress = 0
        
        while current_start < end_ts:
            params = {
                "symbol": symbol,
                "interval": interval,
                "startTime": current_start,
                "endTime": end_ts,
                "limit": LIMIT
            }
            
            try:
                # Try primary endpoint first
                r = requests.get(BASE, params=params, timeout=30)
                
                # If eligibility error, try fallback endpoint
                if r.status_code == 451 or (r.status_code == 400 and "restricted location" in r.text.lower()):
                    r = requests.get(BASE_FALLBACK, params=params, timeout=30)
                
                r.raise_for_status()
                data = r.json()
                
                if not data:
                    break
                
                rows.extend(data)
                last_open = data[-1][0]
                
                progress = ((last_open - start_ts) / (end_ts - start_ts)) * 100
                pbar.update(progress - last_progress)
                last_progress = progress
                
                if last_open >= end_ts:
                    break
                
                current_start = last_open + 1
                time.sleep(0.2)
                
            except Exception as e:
                tqdm.write(f"{Colors.RED}[!] Error: {e}{Colors.RESET}")
                time.sleep(1)
                continue
        
        pbar.update(100 - last_progress)
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # Write to CSV
    with open(output_file, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "open_time_ms", "open", "high", "low", "close", "volume",
            "close_time_ms", "quote_asset_volume", "number_of_trades",
            "taker_buy_base_asset_volume", "taker_buy_quote_asset_volume", "ignore"
        ])
        for r in rows:
            writer.writerow([
                r[0], r[1], r[2], r[3], r[4], r[5], r[6],
                r[7], r[8], r[9], r[10], r[11]
            ])
    
    print(f"{Colors.GREEN}[+] Saved {len(rows)} candles to {output_file}{Colors.RESET}")
    return len(rows)


def interactive_mode():
    """Run the tool in interactive mode"""
    print_banner()
    
    # Get symbol with verification
    while True:
        print(f"\n{Colors.CYAN}[>] Enter cryptocurrency symbol (e.g., BTCUSDT, ETHUSDT, SOLUSDT):{Colors.RESET}")
        symbol = input(f"{Colors.YELLOW}>>> {Colors.RESET}").strip().upper()
        
        if not symbol:
            print(f"{Colors.RED}[!] No symbol entered. Exiting.{Colors.RESET}")
            return
        
        print(f"{Colors.YELLOW}[*] Verifying symbol...{Colors.RESET}")
        if verify_symbol(symbol):
            print(f"{Colors.GREEN}[+] Symbol verified: {symbol}{Colors.RESET}")
            break
        else:
            print(f"{Colors.RED}[!] Invalid symbol '{symbol}'. Please enter a valid USDT trading pair.{Colors.RESET}")
            print(f"{Colors.YELLOW}[*] Examples: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT{Colors.RESET}")
    
    # Get intervals
    print(f"\n{Colors.CYAN}[>] Available intervals:{Colors.RESET}\n")
    for i, interval in enumerate(INTERVALS, 1):
        print(f"  {Colors.YELLOW}{i:2d}.{Colors.RESET} {interval}")
    
    print(f"\n{Colors.CYAN}[>] Select intervals (comma-separated, e.g., 1,4,6 or 'all'):{Colors.RESET}")
    interval_choice = input(f"{Colors.YELLOW}>>> {Colors.RESET}").strip()
    
    if interval_choice.lower() == "all":
        selected_intervals = INTERVALS
    else:
        try:
            indices = [int(x.strip()) - 1 for x in interval_choice.split(",")]
            selected_intervals = [INTERVALS[i] for i in indices]
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
    default_dir = symbol.replace("USDT", "").lower()
    print(f"\n{Colors.CYAN}[>] Output directory (default: {default_dir}/):{Colors.RESET}")
    output_dir = input(f"{Colors.YELLOW}>>> {Colors.RESET}").strip() or default_dir
    
    # Confirm
    separator = "=" * 65
    print(f"\n{Colors.BOLD}{separator}{Colors.RESET}")
    print(f"{Colors.GREEN}[+] DOWNLOAD SUMMARY{Colors.RESET}")
    print(f"{Colors.BOLD}{separator}{Colors.RESET}")
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
    
    for interval in selected_intervals:
        filename_interval = INTERVAL_FILENAMES[interval]
        filename = f"{output_dir}/{symbol.lower()}_{filename_interval}.csv"
        candles = fetch_klines(symbol, interval, start_date, end_date, filename)
        total_candles += candles
    
    print(f"\n{Colors.BOLD}{separator}{Colors.RESET}")
    print(f"{Colors.GREEN}[+] Download complete! Total candles: {total_candles:,}{Colors.RESET}")
    print(f"{Colors.BOLD}{separator}{Colors.RESET}")


if __name__ == "__main__":
    interactive_mode()


