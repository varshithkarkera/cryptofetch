# cryptofetch

> Fast, free, and self-hostable historical cryptocurrency OHLCV candlestick data downloader powered by Binance Public API. Available as an interactive Python CLI and a 100% serverless web application.

---

## Overview

**cryptofetch** lets you download high-resolution OHLCV (Open, High, Low, Close, Volume) candlestick historical price data directly from Binance Vision Public API with:
- **No API keys required**
- **No rate limit restrictions**
- **Completely free & open source**
- **15 timeframes** (`1m` to `1M`)
- **All 500+ USDT trading pairs**
- **Instant CSV & ZIP exports** formatted for quantitative backtesting

---

## 1. Web Application (`cryptofetch-web`)

> **Live Web App**: [cryptofetch.vercel.app](https://cryptofetch.vercel.app)

A modern, high-performance web interface designed for fast and intuitive historical cryptocurrency data extraction.
- **100% Serverless**: Client-side direct streaming from Binance Vision API straight to browser memory.
- **Single & Multi-Crypto Modes**: Download a single asset or batch-fetch multiple coins at once.
- **ZIP Bundling**: When downloading multiple intervals or pairs, assets are automatically packed into a clean `.zip` archive via JSZip.
- **Dynamic Theming**: Obsidian dark & crisp white light modes with smooth view-transitions.
- **Zero Scroll Layout**: Clean 2-column interface designed to fit seamlessly on modern desktop screens.

### Quick Start (Web App)

```bash
cd cryptofetch-web

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deploy to Vercel

```bash
# Deploy straight from the cryptofetch-web folder
vercel
```

---

## 2. Interactive CLI (`cryptofetch.py`)

Interactive command-line tool with color-coded prompts and live progress tracking.

### Prerequisites

```bash
pip install requests tqdm
```

### Quick Start (CLI)

```bash
python cryptofetch.py
```

Follow the interactive prompts:
1. Enter cryptocurrency symbol (e.g. `BTCUSDT`, `ETHUSDT`, `SOLUSDT`)
2. Select intervals (e.g. `1,4,6` for 1m, 15m, 1h or `all`)
3. Enter start date (`YYYY-MM-DD`)
4. Enter end date (`YYYY-MM-DD`)
5. Specify output directory (defaults to `<symbol>/`)
6. Confirm and download

### Example CLI Session

```
    ╔═════════════════════════════════════════════════════════════╗
    ║                                                             ║
    ║   ██████╗██████╗ ██╗   ██╗██████╗ ████████╗ ██████╗         ║ 
    ║  ██╔════╝██╔══██╗╚██╗ ██╔╝██╔══██╗╚══██╔══╝██╔═══██╗        ║
    ║  ██║     ██████╔╝ ╚████╔╝ ██████╔╝   ██║   ██║   ██║        ║
    ║  ██║     ██╔══██╗  ╚██╔╝  ██╔═══╝    ██║   ██║   ██║        ║
    ║  ╚██████╗██║  ██║   ██║   ██║        ██║   ╚██████╔╝        ║
    ║   ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝        ╚═╝    ╚═════╝         ║
    ║                                                             ║
    ║  ███████╗███████╗████████╗ ██████╗██╗  ██╗                  ║
    ║  ██╔════╝██╔════╝╚══██╔══╝██╔════╝██║  ██║                  ║
    ║  █████╗  █████╗     ██║   ██║     ███████║                  ║
    ║  ██╔══╝  ██╔══╝     ██║   ██║     ██╔══██║                  ║
    ║  ██║     ███████╗   ██║   ╚██████╗██║  ██║                  ║
    ║  ╚═╝     ╚══════╝   ╚═╝    ╚═════╝╚═╝  ╚═╝                  ║
    ║                                                             ║
    ║        Historical Crypto Data Downloader                    ║
    ║                                                             ║
    ║        [>] github.com/varshithkarkera                       ║
    ║                                                             ║
    ╚═════════════════════════════════════════════════════════════╝

[>] Enter cryptocurrency symbol (e.g., BTCUSDT, ETHUSDT, SOLUSDT):
>>> SOLUSDT

[>] Available intervals:
   1. 1m
   2. 3m
   3. 5m
   4. 15m
   5. 30m
   6. 1h
   7. 2h
   8. 4h
   9. 6h
  10. 8h
  11. 12h
  12. 1d
  13. 3d
  14. 1w
  15. 1M

[>] Select intervals (comma-separated, e.g., 1,4,6 or 'all'):
>>> 1,4,6

[>] Start date (YYYY-MM-DD):
>>> 2020-09-01

[>] End date (YYYY-MM-DD):
>>> 2026-01-03

[>] Output directory (default: sol/):
>>> 

=================================================================
[+] DOWNLOAD SUMMARY
=================================================================
  Symbol:      SOLUSDT
  Intervals:  1m, 15m, 1h
  Date Range: 2020-09-01 to 2026-01-03
  Output:     sol/
=================================================================

[?] Start download? (y/n):
>>> y

[+] Starting download...

[*] Fetching SOLUSDT 1m from 2020-09-01 to 2026-01-03
SOLUSDT 1m |████████████████████| 100.0%
[+] Saved 2,828,160 candles to sol/solusdt_1m.csv
[+] Saved 2,828,160 candles to sol/solusdt_1min_fetched_20260103_120000.csv
```

---

## Supported Cryptocurrencies

Supports **all USDT trading pairs** available on Binance, including:
- Bitcoin (`BTCUSDT`)
- Ethereum (`ETHUSDT`)
- Solana (`SOLUSDT`)
- BNB (`BNBUSDT`)
- XRP (`XRPUSDT`)
- Cardano (`ADAUSDT`)
- Dogecoin (`DOGEUSDT`)
- And 500+ more...

---

## Available Timeframes

`1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `8h`, `12h`, `1d`, `3d`, `1w`, `1M`

---

## Data Format

Each CSV dataset contains standard OHLCV backtest headers:

| Column | Description |
|--------|-------------|
| `open_time_ms` | Candle open timestamp in milliseconds (Unix epoch) |
| `open` | Opening price |
| `high` | Highest price during the candle |
| `low` | Lowest price during the candle |
| `close` | Closing price |
| `volume` | Base asset trading volume |
| `close_time_ms` | Candle close timestamp in milliseconds (Unix epoch) |
| `quote_asset_volume` | Quote asset volume (USDT) |
| `number_of_trades` | Number of executed trades |
| `taker_buy_base_asset_volume` | Taker buy base asset volume |
| `taker_buy_quote_asset_volume` | Taker buy quote asset volume |
| `ignore` | Unused / reserved field (0) |

---

## Data Source

Directly sourced from the [Binance Vision Spot API](https://developers.binance.com/docs/binance-spot-api-docs).

---

## Bitcoin Historical Data

For pre-compiled historical Bitcoin datasets, see:
- [Kaggle - Bitcoin Historical Datasets (2018–2024)](https://www.kaggle.com/datasets/novandraanugrah/bitcoin-historical-datasets-2018-2024)

---

## Star History

<p align="center">
  <img src="https://api.star-history.com/svg?repos=varshithkarkera/cryptofetch&type=Date&theme=dark&v=1" alt="cryptofetch Star History" />
</p>

---

## Connect & Support

- **X (Twitter)**: [@varshithkarkera](https://x.com/varshithkarkera)
- **Portfolio**: [varshith.me](https://varshith.me)
- **Buy Me a Coffee**: [buymeacoffee.com/varshithkarkera](https://buymeacoffee.com/varshithkarkera)

---

## License

This dataset is provided as-is under the MIT License. The data is sourced from Binance's public API.

