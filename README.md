# cryptofetch

> Fast, free, and self-hostable historical cryptocurrency OHLCV candlestick data downloader. Pick your source: Binance, OKX, Coinbase, Bitget or Gate public APIs. Available as an interactive Python CLI and a 100% serverless web application.

---

## Overview

**cryptofetch** lets you download high-resolution OHLCV (Open, High, Low, Close, Volume) candlestick historical price data directly from public exchange APIs with:
- **5 exchanges**: Binance (default), OKX, Coinbase, Bitget, Gate
- **No API keys required**
- **Light on the exchanges**: requests are paced to stay within each exchange's public rate limits (the web app calls them straight from your browser, so limits apply to your own IP)
- **Completely free & open source**
- **Up to 15 timeframes** (`1m` to `1M`, depending on the exchange)
- **Hundreds of trading pairs** per exchange
- **One CSV format** for every exchange, formatted for quantitative backtesting
- **Instant CSV & ZIP exports**

### Exchanges

| Exchange | Symbol style | Intervals | Notes |
|----------|--------------|-----------|-------|
| Binance (default) | `BTCUSDT` | all 15 | Binance Vision public API |
| OKX | `BTC-USDT` | all except `8h` | UTC-aligned daily/weekly/monthly candles |
| Coinbase | `BTC-USD` | `1m` `5m` `15m` `1h` `6h` `1d` | Mostly USD pairs; 300 candles per request |
| Bitget | `BTCUSDT` | all except `2h` `8h` | UTC-aligned daily/weekly/monthly candles |
| Gate | `BTC_USDT` | `1m` `5m` `15m` `30m` `1h` `4h` `8h` `1d` `1w` | Only the latest 10,000 candles per interval |

You can type just the coin (`BTC`) or any style (`BTCUSDT`, `BTC-USDT`, `btc_usdt`); cryptofetch converts it for the selected exchange. Prices and volumes differ slightly between exchanges because each reports its own market. Columns an exchange does not provide (for example trade counts) are left empty.

---

## 1. Web Application (`cryptofetch-web`)

> **Live Web App**: [cryptofetch.vercel.app](https://cryptofetch.vercel.app)

A modern, high-performance web interface designed for fast and intuitive historical cryptocurrency data extraction.
- **100% Serverless**: Client-side direct streaming from the exchange's public API straight to browser memory.
- **Exchange picker**: Switch between Binance, OKX, Coinbase, Bitget and Gate; unsupported intervals are greyed out for the chosen exchange.
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

# or pick the exchange up front: binance, okx, coinbase, bitget, gate
python cryptofetch.py --exchange okx
```

Follow the interactive prompts:
0. Select the exchange (Enter for Binance)
1. Enter cryptocurrency symbol (e.g. `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, or just `BTC`)
2. Select intervals (e.g. `1,4,6` for 1m, 15m, 1h or `all`; the list shows what the exchange supports)
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

Supports the spot trading pairs of every supported exchange (USDT pairs on Binance, OKX, Bitget and Gate, mostly USD pairs on Coinbase), including:
- Bitcoin (`BTCUSDT`)
- Ethereum (`ETHUSDT`)
- Solana (`SOLUSDT`)
- BNB (`BNBUSDT`)
- XRP (`XRPUSDT`)
- Cardano (`ADAUSDT`)
- Dogecoin (`DOGEUSDT`)
- And hundreds more...

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

Directly sourced from the public market data APIs of Binance ([Binance Vision](https://developers.binance.com/docs/binance-spot-api-docs)), OKX, Coinbase Exchange, Bitget and Gate. No account or key is needed. Each exchange has its own terms of use for its API, so please check them before redistributing the data. Files from exchanges other than Binance are named with the exchange as a prefix (for example `okx_btc-usdt_1h_...csv`).

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

This dataset is provided as-is under the MIT License. The data is sourced from the public APIs of the exchanges listed above.

