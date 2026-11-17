/**
 * Exchange adapters for cryptofetch.
 *
 * Every adapter talks to a public, key-less market-data endpoint that allows
 * browser (CORS) requests, and returns candles in ONE normalized row layout
 * (the same 12 columns Binance uses), so the CSV format never changes:
 *
 * [open_time_ms, open, high, low, close, volume, close_time_ms,
 *  quote_asset_volume, number_of_trades, taker_buy_base, taker_buy_quote, ignore]
 *
 * Fields an exchange does not provide are left as "".
 */

export type Cell = string | number
export type CandleRow = Cell[]
export type ExchangeId = "binance" | "okx" | "coinbase" | "bitget" | "gate"

export const CSV_HEADER =
  "open_time_ms,open,high,low,close,volume,close_time_ms,quote_asset_volume,number_of_trades,taker_buy_base_asset_volume,taker_buy_quote_asset_volume,ignore"

export const ALL_INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"] as const

const INTERVAL_MS: Record<string, number> = {
  "1m": 60_000, "3m": 180_000, "5m": 300_000, "15m": 900_000, "30m": 1_800_000,
  "1h": 3_600_000, "2h": 7_200_000, "4h": 14_400_000, "6h": 21_600_000, "8h": 28_800_000,
  "12h": 43_200_000, "1d": 86_400_000, "3d": 259_200_000, "1w": 604_800_000,
}

export interface Ticker { price: string; change?: string }

export interface Exchange {
  id: ExchangeId
  name: string
  /** Quote currency added when the user types only a coin, e.g. "BTC" */
  defaultQuote: string
  intervals: string[]
  /** Short note shown in the UI about this exchange's limits */
  note?: string
  /** Oldest candle the exchange will serve for an interval, when it has a cap (else undefined) */
  earliestMs?(interval: string): number
  /** Turns "btc", "BTCUSDT", "BTC-USDT", "btc/usd" into this exchange's symbol */
  toSymbol(base: string, quote: string): string
  ticker(base: string, quote: string): Promise<Ticker | null>
  candles(
    base: string,
    quote: string,
    interval: string,
    startMs: number,
    endMs: number,
    onProgress?: (fraction: number) => void,
  ): Promise<CandleRow[]>
}

const QUOTES = ["USDT", "USDC", "FDUSD", "BUSD", "TUSD", "DAI", "USD", "EUR", "GBP", "TRY", "BRL", "BTC", "ETH", "BNB"]

/** Split user input into base + quote. Accepts BTC, BTCUSDT, BTC-USDT, BTC_USDT, BTC/USDT. */
export function parsePair(input: string, defaultQuote: string): { base: string; quote: string } | null {
  const s = input.trim().toUpperCase()
  if (!s) return null
  const sep = s.split(/[-_/ ]+/).filter(Boolean)
  if (sep.length === 2) return { base: sep[0], quote: sep[1] }
  if (sep.length !== 1) return null
  const word = sep[0]
  for (const q of QUOTES) {
    if (word.length > q.length && word.endsWith(q)) return { base: word.slice(0, -q.length), quote: q }
  }
  return { base: word, quote: defaultQuote }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** GET JSON with a few retries on rate limiting / transient errors. Returns null on 4xx (bad symbol). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getJson(url: string, tries = 4): Promise<any | null> {
  for (let i = 0; i < tries; i++) {
    let res: Response
    try {
      res = await fetch(url)
    } catch (e) {
      if (i === tries - 1) throw e
      await sleep(800 * (i + 1))
      continue
    }
    if (res.ok) return res.json()
    if (res.status === 429 || res.status >= 500) {
      await sleep(1000 * (i + 1))
      continue
    }
    return null
  }
  throw new Error("Exchange kept rate limiting or failing, try again in a minute")
}

const num = (v: unknown) => Number(v).toLocaleString()
const closeMs = (open: number, interval: string) =>
  INTERVAL_MS[interval] ? open + INTERVAL_MS[interval] - 1 : ""

function finish(rows: CandleRow[], startMs: number, endMs: number): CandleRow[] {
  const seen = new Set<number>()
  return rows
    .filter((r) => {
      const t = Number(r[0])
      if (t < startMs || t > endMs || seen.has(t)) return false
      seen.add(t)
      return true
    })
    .sort((a, b) => Number(a[0]) - Number(b[0]))
}

// ---------------------------------------------------------------- Binance
const binance: Exchange = {
  id: "binance",
  name: "Binance",
  defaultQuote: "USDT",
  intervals: [...ALL_INTERVALS],
  toSymbol: (b, q) => `${b}${q}`,
  async ticker(b, q) {
    const d = await getJson(`https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${b}${q}`, 1)
    return d ? { price: num(d.lastPrice), change: Number(d.priceChangePercent).toFixed(2) } : null
  },
  async candles(b, q, interval, startMs, endMs, onProgress) {
    const rows: CandleRow[] = []
    let cur = startMs
    while (cur < endMs) {
      const d = await getJson(
        `https://data-api.binance.vision/api/v3/klines?symbol=${b}${q}&interval=${interval}&startTime=${cur}&endTime=${endMs}&limit=1000`,
      )
      if (!d) throw new Error(`Binance rejected ${b}${q} ${interval}`)
      if (d.length === 0) break
      rows.push(...d.map((r: CandleRow) => r.slice(0, 12)))
      const last = d[d.length - 1][0]
      onProgress?.((last - startMs) / (endMs - startMs))
      if (last >= endMs) break
      cur = last + 1
      await sleep(40)
    }
    return finish(rows, startMs, endMs)
  },
}

// -------------------------------------------------------------------- OKX
// Docs: https://www.okx.com/docs-v5/en/#public-data-rest-api-get-candlesticks-history
// "utc" bars are used so daily/weekly/monthly candles open at 00:00 UTC like Binance.
const OKX_BAR: Record<string, string> = {
  "1m": "1m", "3m": "3m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1H", "2h": "2H", "4h": "4H",
  "6h": "6Hutc", "12h": "12Hutc", "1d": "1Dutc", "3d": "3Dutc", "1w": "1Wutc", "1M": "1Mutc",
}
const okx: Exchange = {
  id: "okx",
  name: "OKX",
  defaultQuote: "USDT",
  intervals: Object.keys(OKX_BAR),
  toSymbol: (b, q) => `${b}-${q}`,
  async ticker(b, q) {
    const d = await getJson(`https://www.okx.com/api/v5/market/ticker?instId=${b}-${q}`, 1)
    const t = d?.data?.[0]
    if (!t) return null
    const change = ((Number(t.last) - Number(t.open24h)) / Number(t.open24h)) * 100
    return { price: num(t.last), change: change.toFixed(2) }
  },
  async candles(b, q, interval, startMs, endMs, onProgress) {
    const rows: CandleRow[] = []
    let after = endMs + 1 // returns candles OLDER than `after`, newest first, max 100
    for (;;) {
      const d = await getJson(
        `https://www.okx.com/api/v5/market/history-candles?instId=${b}-${q}&bar=${OKX_BAR[interval]}&after=${after}&limit=100`,
      )
      if (!d || d.code !== "0") throw new Error(`OKX rejected ${b}-${q} ${interval}`)
      const page: string[][] = d.data
      if (page.length === 0) break
      for (const r of page) {
        const t = Number(r[0])
        rows.push([t, r[1], r[2], r[3], r[4], r[5], closeMs(t, interval), r[7], "", "", "", 0])
      }
      const oldest = Number(page[page.length - 1][0])
      onProgress?.((endMs - oldest) / (endMs - startMs))
      if (oldest <= startMs) break
      after = oldest
      await sleep(120) // public limit: 20 requests / 2s
    }
    return finish(rows, startMs, endMs)
  },
}

// --------------------------------------------------------------- Coinbase
// Docs: https://docs.cdp.coinbase.com/exchange/reference/exchangerestapi_getproductcandles
// Only 1m,5m,15m,1h,6h,1d are available; max 300 candles per request; USD pairs by default.
const CB_GRAN: Record<string, number> = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "6h": 21600, "1d": 86400 }
const coinbase: Exchange = {
  id: "coinbase",
  name: "Coinbase",
  defaultQuote: "USD",
  intervals: Object.keys(CB_GRAN),
  note: "Coinbase offers 1m, 5m, 15m, 1h, 6h and 1d candles. Pairs are mostly quoted in USD.",
  toSymbol: (b, q) => `${b}-${q}`,
  async ticker(b, q) {
    const id = `${b}-${q}`
    const [stats, last] = await Promise.all([
      getJson(`https://api.exchange.coinbase.com/products/${id}/stats`, 1),
      getJson(`https://api.exchange.coinbase.com/products/${id}/ticker`, 1),
    ])
    if (!stats || !last) return null
    const change = ((Number(stats.last) - Number(stats.open)) / Number(stats.open)) * 100
    return { price: num(last.price), change: change.toFixed(2) }
  },
  async candles(b, q, interval, startMs, endMs, onProgress) {
    const rows: CandleRow[] = []
    const g = CB_GRAN[interval] * 1000
    const step = g * 300
    for (let cur = startMs; cur <= endMs; cur += step) {
      const to = Math.min(cur + step - g, endMs)
      const d = await getJson(
        `https://api.exchange.coinbase.com/products/${b}-${q}/candles?granularity=${CB_GRAN[interval]}&start=${new Date(cur).toISOString()}&end=${new Date(to).toISOString()}`,
      )
      if (!d) throw new Error(`Coinbase rejected ${b}-${q} ${interval}`)
      for (const r of d) {
        const t = r[0] * 1000 // [time(s), low, high, open, close, volume]
        rows.push([t, r[3], r[2], r[1], r[4], r[5], closeMs(t, interval), "", "", "", "", 0])
      }
      onProgress?.((to - startMs) / (endMs - startMs))
      await sleep(150) // public limit: 10 requests / s
    }
    return finish(rows, startMs, endMs)
  },
}

// ----------------------------------------------------------------- Bitget
// Docs: https://www.bitget.com/api-doc/spot/market/Get-History-Candle-Data
const BITGET_GRAN: Record<string, string> = {
  "1m": "1min", "3m": "3min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "1h", "4h": "4h",
  "6h": "6Hutc", "12h": "12Hutc", "1d": "1Dutc", "3d": "3Dutc", "1w": "1Wutc", "1M": "1Mutc",
}
const bitget: Exchange = {
  id: "bitget",
  name: "Bitget",
  defaultQuote: "USDT",
  intervals: Object.keys(BITGET_GRAN),
  toSymbol: (b, q) => `${b}${q}`,
  async ticker(b, q) {
    const d = await getJson(`https://api.bitget.com/api/v2/spot/market/tickers?symbol=${b}${q}`, 1)
    const t = d?.code === "00000" ? d.data?.[0] : null
    if (!t) return null
    return { price: num(t.lastPr), change: (Number(t.change24h) * 100).toFixed(2) }
  },
  async candles(b, q, interval, startMs, endMs, onProgress) {
    const rows: CandleRow[] = []
    // endTime is compared with candle CLOSE time; returns the newest `limit` candles closing by then, oldest first
    let end = endMs + (INTERVAL_MS[interval] ?? 31 * 86_400_000)
    for (;;) {
      const d = await getJson(
        `https://api.bitget.com/api/v2/spot/market/history-candles?symbol=${b}${q}&granularity=${BITGET_GRAN[interval]}&endTime=${end}&limit=200`,
      )
      if (!d || d.code !== "00000") throw new Error(`Bitget rejected ${b}${q} ${interval}`)
      const page: string[][] = d.data
      if (page.length === 0) break
      for (const r of page) {
        const t = Number(r[0])
        rows.push([t, r[1], r[2], r[3], r[4], r[5], closeMs(t, interval), r[6], "", "", "", 0])
      }
      const oldest = Math.min(...page.map((r) => Number(r[0])))
      onProgress?.((endMs - oldest) / (endMs - startMs))
      if (oldest <= startMs || page.length < 200) break
      end = oldest
      await sleep(100)
    }
    return finish(rows, startMs, endMs)
  },
}

// ------------------------------------------------------------------- Gate
// Docs: https://www.gate.com/docs/developers/apiv4/en/#market-candlesticks
// Max 1000 candles per request. Only these intervals exist (7d used for 1w).
const GATE_INT: Record<string, string> = {
  "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1h", "4h": "4h", "8h": "8h", "1d": "1d", "1w": "7d",
}
const gate: Exchange = {
  id: "gate",
  name: "Gate",
  defaultQuote: "USDT",
  intervals: Object.keys(GATE_INT),
  // Gate only serves the most recent 10,000 candles of each interval
  note: "Gate only serves the latest 10,000 candles per interval, so older start dates are trimmed.",
  earliestMs: (interval) => Date.now() - 9_990 * INTERVAL_MS[interval],
  toSymbol: (b, q) => `${b}_${q}`,
  async ticker(b, q) {
    const d = await getJson(`https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${b}_${q}`, 1)
    const t = Array.isArray(d) ? d[0] : null
    return t ? { price: num(t.last), change: Number(t.change_percentage).toFixed(2) } : null
  },
  async candles(b, q, interval, startMs, endMs, onProgress) {
    const rows: CandleRow[] = []
    const step = INTERVAL_MS[interval] * 999
    startMs = Math.max(startMs, gate.earliestMs!(interval))
    for (let cur = startMs; cur <= endMs; cur += step + INTERVAL_MS[interval]) {
      const to = Math.min(cur + step, endMs)
      const d = await getJson(
        `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${b}_${q}&interval=${GATE_INT[interval]}&from=${Math.floor(cur / 1000)}&to=${Math.floor(to / 1000)}`,
      )
      if (!d || !Array.isArray(d)) throw new Error(`Gate rejected ${b}_${q} ${interval}`)
      for (const r of d) {
        const t = Number(r[0]) * 1000 // [time, quote vol, close, high, low, open, base vol, closed]
        rows.push([t, r[5], r[3], r[4], r[2], r[6], closeMs(t, interval), r[1], "", "", "", 0])
      }
      onProgress?.((to - startMs) / (endMs - startMs))
      await sleep(100)
    }
    return finish(rows, startMs, endMs)
  },
}

export const EXCHANGES: Exchange[] = [binance, okx, coinbase, bitget, gate]
export const getExchange = (id: ExchangeId) => EXCHANGES.find((e) => e.id === id)!

export function toCsv(rows: CandleRow[]): string {
  return CSV_HEADER + "\n" + rows.map((r) => r.join(",")).join("\n")
}
