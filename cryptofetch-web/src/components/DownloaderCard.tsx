"use client"

import React, { useState, useEffect } from 'react'
import {
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Plus,
  Layers,
  FileSpreadsheet,
  FileArchive
} from 'lucide-react'
import confetti from 'canvas-confetti'
import JSZip from 'jszip'
import { EXCHANGES, getExchange, parsePair, toCsv, type ExchangeId } from '@/lib/exchanges'

const INTERVAL_OPTIONS = [
  { id: "1m", label: "1m" },
  { id: "3m", label: "3m" },
  { id: "5m", label: "5m" },
  { id: "15m", label: "15m" },
  { id: "30m", label: "30m" },
  { id: "1h", label: "1h" },
  { id: "2h", label: "2h" },
  { id: "4h", label: "4h" },
  { id: "6h", label: "6h" },
  { id: "8h", label: "8h" },
  { id: "12h", label: "12h" },
  { id: "1d", label: "1d" },
  { id: "3d", label: "3d" },
  { id: "1w", label: "1w" },
  { id: "1M", label: "1M" },
]

const POPULAR_COINS = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "PEPE", "SUI"]

export default function DownloaderCard() {
  // Data source (exchange)
  const [exchangeId, setExchangeId] = useState<ExchangeId>("binance")
  const ex = getExchange(exchangeId)
  const pairOf = (text: string) => parsePair(text, ex.defaultQuote)
  const symbolOf = (base: string, quote: string = ex.defaultQuote) => ex.toSymbol(base, quote)
  // Coin text is kept in the selected exchange's own style (BTCUSDT, BTC-USDT, BTC_USDT...)
  const isDefaultCoin = (text: string, coin: string) => {
    const p = pairOf(text)
    return !!p && p.base === coin && p.quote === ex.defaultQuote
  }

  // Mode toggle: Single Crypto vs Multiple Cryptos
  const [isMultiMode, setIsMultiMode] = useState(false)

  // Single mode state
  const [singleSymbol, setSingleSymbol] = useState("BTCUSDT")
  const [singleVerified, setSingleVerified] = useState<{
    valid: boolean
    price?: string
    change?: string
  } | null>(null)
  const [singleVerifying, setSingleVerifying] = useState(false)

  // Multi mode state
  const [symbols, setSymbols] = useState<string[]>(["BTCUSDT", "ETHUSDT"])
  const [inputVal, setInputVal] = useState("")
  const [multiVerifying, setMultiVerifying] = useState(false)
  const [verifiedCoins, setVerifiedCoins] = useState<Record<string, { valid: boolean; price?: string; change?: string }>>({})

  // Shared intervals and dates
  const [selectedIntervals, setSelectedIntervals] = useState<string[]>(["1h"])
  
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(thirtyDaysAgo)
  const [endDate, setEndDate] = useState(today)

  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")

  // Single symbol debounce verification
  useEffect(() => {
    if (!singleSymbol || singleSymbol.length < 3) {
      setSingleVerified(null)
      return
    }

    const timer = setTimeout(async () => {
      setSingleVerifying(true)
      try {
        const p = pairOf(singleSymbol)
        const t = p ? await ex.ticker(p.base, p.quote) : null
        setSingleVerified(t ? { valid: true, price: t.price, change: t.change } : { valid: false })
      } catch {
        setSingleVerified({ valid: false })
      } finally {
        setSingleVerifying(false)
      }
    }, 400)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleSymbol, exchangeId])

  // Fetch prices helper
  const fetchPrice = async (sym: string) => {
    try {
      const p = pairOf(sym)
      const t = p ? await ex.ticker(p.base, p.quote) : null
      if (!t) return false
      setVerifiedCoins((prev) => ({ ...prev, [sym]: { valid: true, price: t.price, change: t.change } }))
      return true
    } catch {
      return false
    }
  }

  const addMultiSymbol = async (rawSym: string) => {
    const parsed = pairOf(rawSym)
    if (!parsed) return
    const clean = symbolOf(parsed.base, parsed.quote)
    if (symbols.includes(clean)) {
      setInputVal("")
      return
    }

    setMultiVerifying(true)
    const isValid = await fetchPrice(clean)
    setMultiVerifying(false)

    if (isValid) {
      setSymbols([...symbols, clean])
      setInputVal("")
    } else {
      alert(`Invalid symbol "${clean}". Please enter a valid ${ex.name} trading pair.`)
    }
  }

  const removeMultiSymbol = (symToRemove: string) => {
    if (symbols.length <= 1) return
    setSymbols(symbols.filter((s) => s !== symToRemove))
  }

  const switchExchange = (id: ExchangeId) => {
    if (id === exchangeId) return
    const next = getExchange(id)
    const remap = (text: string) => {
      const p = parsePair(text, ex.defaultQuote)
      if (!p) return text
      const q = p.quote === "USDT" || p.quote === "USD" ? next.defaultQuote : p.quote
      return next.toSymbol(p.base, q)
    }
    setExchangeId(id)
    setSingleSymbol(remap(singleSymbol))
    setSymbols(symbols.map(remap))
    setVerifiedCoins({})
    setSingleVerified(null)
    const kept = selectedIntervals.filter((i) => next.intervals.includes(i))
    setSelectedIntervals(kept.length ? kept : ["1h"])
  }

  const toggleInterval = (id: string) => {
    if (selectedIntervals.includes(id)) {
      if (selectedIntervals.length > 1) {
        setSelectedIntervals(selectedIntervals.filter((i) => i !== id))
      }
    } else {
      setSelectedIntervals([...selectedIntervals, id])
    }
  }

  const selectAllIntervals = () => {
    if (selectedIntervals.length === ex.intervals.length) {
      setSelectedIntervals(["1h"])
    } else {
      setSelectedIntervals([...ex.intervals])
    }
  }

  const setPresetRange = (days: number) => {
    const end = new Date().toISOString().split('T')[0]
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    setStartDate(start)
    setEndDate(end)
  }

  const handleDownload = async () => {
    const activeSymbols = isMultiMode ? symbols : [singleSymbol.toUpperCase().trim()].filter(Boolean)
    if (activeSymbols.length === 0) return
    if (!startDate || !endDate) return
    if (new Date(startDate) >= new Date(endDate)) {
      alert("Start date must be before end date")
      return
    }

    setDownloading(true)
    setDownloadProgress(2)
    setStatusMessage(`Connecting to ${ex.name}...`)

    try {
      const startTs = new Date(startDate).getTime()
      const endTs = new Date(endDate).getTime()
      const totalOperations = activeSymbols.length * selectedIntervals.length
      let currentOp = 0
      const warnings: string[] = []

      const shouldZip = activeSymbols.length > 1 || selectedIntervals.length > 1
      const zip = shouldZip ? new JSZip() : null

      const now = new Date()
      const fetchedAt = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}_${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}`
      // Binance files keep their original names; other exchanges are prefixed so files never mix up
      const prefix = ex.id === "binance" ? "" : `${ex.id}_`

      for (let sIdx = 0; sIdx < activeSymbols.length; sIdx++) {
        const sym = activeSymbols[sIdx]
        const pair = pairOf(sym)
        if (!pair) throw new Error(`Invalid symbol "${sym}"`)

        for (let iIdx = 0; iIdx < selectedIntervals.length; iIdx++) {
          const interval = selectedIntervals[iIdx]
          setStatusMessage(`Streaming ${sym} [${interval}] from ${ex.name}...`)

          const earliest = ex.earliestMs?.(interval)
          if (earliest && startTs < earliest) {
            warnings.push(`${ex.name} only has ${interval} candles from ${new Date(earliest).toISOString().split('T')[0]}`)
          }

          const rows = await ex.candles(pair.base, pair.quote, interval, startTs, endTs, (fraction) => {
            const f = Math.max(0, Math.min(1, fraction))
            setDownloadProgress(Math.min(95, Math.round(((currentOp + f) / totalOperations) * 100)))
          })

          currentOp++

          if (rows.length === 0) {
            warnings.push(`no ${interval} data for ${sym}`)
            continue
          }

          const csvText = toCsv(rows)
          const filename = `${prefix}${sym.toLowerCase()}_${interval}_${startDate}_${endDate}_fetched_${fetchedAt}.csv`

          if (shouldZip && zip) {
            zip.file(filename, csvText)
          } else {
            const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" })
            const a = document.createElement("a")
            a.href = URL.createObjectURL(blob)
            a.download = filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
          }
        }
      }

      if (shouldZip && zip) {
        setStatusMessage("Building ZIP package...")
        const zipBlob = await zip.generateAsync({ type: "blob" })
        const a = document.createElement("a")
        a.href = URL.createObjectURL(zipBlob)
        a.download = `cryptofetch_datasets_${startDate}_${endDate}.zip`
        a.download = `cryptofetch_${prefix}datasets_${startDate}_${endDate}_fetched_${fetchedAt}.zip`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }

      setDownloadProgress(100)
      setStatusMessage(warnings.length ? `Done. Note: ${warnings.join("; ")}` : "Download complete!")
      confetti({ particleCount: 90, spread: 60, origin: { y: 0.7 } })
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message || "Failed to download data"}`)
    } finally {
      setTimeout(() => {
        setDownloading(false)
        setDownloadProgress(0)
      }, 4500)
    }
  }

  const activeCount = isMultiMode ? symbols.length : 1
  const activeDatasetCount = activeCount * selectedIntervals.length


  return (
    <div className="w-full border border-dashed border-[var(--line)] rounded-xl bg-[var(--chip)] p-5 sm:p-7 space-y-6">

      {/* 0. Data source */}
      <div className="space-y-2.5">
        <label className="mono text-[11px] font-medium text-[var(--faint)] uppercase tracking-[.14em] block">Exchange</label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Exchange">
          {EXCHANGES.map((e) => (
            <button
              key={e.id}
              role="radio"
              aria-checked={e.id === exchangeId}
              disabled={downloading}
              onClick={() => switchExchange(e.id)}
              className={`text-xs sm:text-[13px] px-3.5 py-1.5 rounded-md border transition-all duration-150 cursor-pointer ${
                e.id === exchangeId
                  ? "bg-[var(--text)] text-[var(--bg)] border-solid border-[var(--text)] font-semibold"
                  : "border-dashed border-[var(--line2)] bg-transparent text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
              }`}
            >
              {e.name}
            </button>
          ))}
        </div>
        {ex.note && <p className="mono text-[11px] text-[var(--faint)]">{ex.note}</p>}
      </div>

      <div className="border-t border-dashed border-[var(--line)]" />

      {/* 1. Header with Mode Switch */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <label className="mono text-[11px] font-medium text-[var(--faint)] uppercase tracking-[.14em] block">
            {isMultiMode ? `Selected Cryptos (${symbols.length})` : "Cryptocurrency Symbol"}
          </label>

          {/* Mode Switch Button */}
          <button
            type="button"
            onClick={() => setIsMultiMode(!isMultiMode)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 mono text-[11px] px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
              isMultiMode
                ? "bg-[var(--text)] text-[var(--bg)] border-solid border-[var(--text)] font-semibold"
                : "border-dashed border-[var(--line2)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>{isMultiMode ? "Single Mode" : "Download Multiple"}</span>
          </button>
        </div>

        {/* Mode A: Clean Single Symbol Input (Default) */}
        {!isMultiMode ? (
          <div>
            <div className="relative">
              <input
                type="text"
                value={singleSymbol}
                onChange={(e) => setSingleSymbol(e.target.value.toUpperCase())}
                placeholder={`e.g. ${symbolOf("BTC")}, ${symbolOf("SOL")}, ${symbolOf("ETH")}`}
                className="mono w-full px-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--line2)] text-[var(--text)] font-semibold text-sm focus:outline-none focus:border-[var(--faint)] transition-all uppercase placeholder:normal-case placeholder:text-[var(--faint)] placeholder:font-normal"
              />

              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {singleVerifying && <Loader2 className="w-4 h-4 text-[var(--faint)] animate-spin" />}
                {!singleVerifying && singleVerified?.valid && (
                  <span className="mono inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-emerald-600 dark:text-emerald-400 text-[11px] font-medium border border-dashed border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
                {!singleVerifying && singleVerified && !singleVerified.valid && (
                  <span className="mono inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-red-600 dark:text-red-400 text-[11px] font-medium border border-dashed border-red-500/40">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Invalid Pair
                  </span>
                )}
              </div>
            </div>

            {/* Live price tag */}
            {singleVerified?.valid && (
              <div className="mono flex items-center gap-3 text-xs text-[var(--muted)] pt-2">
                <span className="flex items-center gap-1.5">
                  <span className="text-[var(--faint)]">Price:</span>
                  <span className="font-semibold text-[var(--text)]">
                    ${singleVerified.price}
                  </span>
                </span>
                <span className={`font-semibold ${Number(singleVerified.change) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {Number(singleVerified.change) >= 0 ? "+" : ""}{singleVerified.change}% (24h)
                </span>
              </div>
            )}

            {/* Quick popular coins */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2.5">
              <span className="mono text-[11px] text-[var(--faint)] mr-1">Popular:</span>
              {POPULAR_COINS.map((coin) => (
                <button
                  key={coin}
                  onClick={() => setSingleSymbol(symbolOf(coin))}
                  className={`mono text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                    isDefaultCoin(singleSymbol, coin)
                      ? "bg-[var(--text)] text-[var(--bg)] border-solid border-[var(--text)] font-semibold"
                      : "border-dotted border-[var(--line2)] bg-[var(--chip)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--faint)]"
                  }`}
                >
                  {coin}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Mode B: Multi-Symbol Tag System (Activated when "Download Multiple" is clicked) */
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 items-center min-h-10 p-2 rounded-lg bg-[var(--bg)] border border-[var(--line2)]">
              {symbols.map((sym) => {
                return (
                  <span
                    key={sym}
                    className="mono inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--text)] text-[var(--bg)] text-[11px] font-semibold"
                  >
                    <span>{sym}</span>
                    {symbols.length > 1 && (
                      <button
                        onClick={() => removeMultiSymbol(sym)}
                        className="p-0.5 hover:opacity-70 rounded-full transition-opacity cursor-pointer ml-0.5"
                        title={`Remove ${sym}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                )
              })}

              <div className="flex-1 min-w-[120px] flex items-center gap-1">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addMultiSymbol(inputVal)
                    }
                  }}
                  placeholder="+ Add coin (SOL, ADA...)"
                  className="mono w-full bg-transparent px-2 py-1 text-xs font-medium text-[var(--text)] placeholder:text-[var(--faint)] focus:outline-none uppercase"
                />
                {inputVal && (
                  <button
                    onClick={() => addMultiSymbol(inputVal)}
                    disabled={multiVerifying}
                    className="p-1 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer shrink-0"
                  >
                    {multiVerifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>

            {/* Quick Add Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="mono text-[11px] text-[var(--faint)] mr-1">Quick Add:</span>
              {POPULAR_COINS.map((coin) => {
                const isAdded = symbols.some((sx) => isDefaultCoin(sx, coin))
                return (
                  <button
                    key={coin}
                    onClick={() => {
                      if (isAdded) removeMultiSymbol(symbols.find((sx) => isDefaultCoin(sx, coin))!)
                      else addMultiSymbol(coin)
                    }}
                    className={`mono text-[11px] px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                      isAdded
                        ? "bg-[var(--text)] text-[var(--bg)] border-solid border-[var(--text)] font-semibold"
                        : "border-dotted border-[var(--line2)] bg-[var(--chip)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--faint)]"
                    }`}
                  >
                    {coin}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-[var(--line)]" />

      {/* 2. Candle Intervals Selection */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="mono text-[11px] font-medium text-[var(--faint)] uppercase tracking-[.14em] block">
            Candle Intervals ({selectedIntervals.length} selected)
          </label>
          <button
            onClick={selectAllIntervals}
            className="mono text-[11px] text-[var(--faint)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            {selectedIntervals.length === ex.intervals.length ? "Reset to 1h" : "Select All"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {INTERVAL_OPTIONS.map((intv) => {
            const isSelected = selectedIntervals.includes(intv.id)
            const supported = ex.intervals.includes(intv.id)
            return (
              <button
                key={intv.id}
                onClick={() => supported && toggleInterval(intv.id)}
                disabled={!supported}
                title={supported ? undefined : `${ex.name} does not offer ${intv.label} candles`}
                className={`${!supported ? "opacity-30 line-through cursor-not-allowed " : ""}mono text-[11px] sm:text-xs px-3 py-1.5 rounded-md border transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-[var(--text)] text-[var(--bg)] border-solid border-[var(--text)] font-semibold"
                    : "border-dashed border-[var(--line2)] bg-transparent text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
                }`}
              >
                {intv.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-dashed border-[var(--line)]" />

      {/* 3. Date Range Selection */}
      <div className="p-4 rounded-lg border border-dashed border-[var(--line)] bg-[var(--chip)] space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label className="mono text-[11px] font-medium text-[var(--faint)] uppercase tracking-[.14em] block">
            Historical Date Range
          </label>
          <div className="mono flex items-center gap-1 text-[11px] text-[var(--faint)]">
            <span className="hidden sm:inline mr-0.5">Presets:</span>
            <button onClick={() => setPresetRange(7)} className="px-2 py-0.5 rounded hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer transition-colors">7D</button>
            <button onClick={() => setPresetRange(30)} className="px-2 py-0.5 rounded hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer transition-colors">30D</button>
            <button onClick={() => setPresetRange(180)} className="px-2 py-0.5 rounded hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer transition-colors">6M</button>
            <button onClick={() => setPresetRange(365)} className="px-2 py-0.5 rounded hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer transition-colors">1Y</button>
            <button onClick={() => setPresetRange(365 * 3)} className="px-2 py-0.5 rounded hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer transition-colors">3Y</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="mono text-[11px] text-[var(--muted)]">Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mono w-full px-3.5 py-2 rounded-lg bg-[var(--bg)] border border-[var(--line2)] text-[var(--text)] text-xs focus:outline-none focus:border-[var(--faint)] [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div className="space-y-1">
            <span className="mono text-[11px] text-[var(--muted)]">End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mono w-full px-3.5 py-2 rounded-lg bg-[var(--bg)] border border-[var(--line2)] text-[var(--text)] text-xs focus:outline-none focus:border-[var(--faint)] [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* Progress feedback bar */}
      {downloading && (
        <div className="space-y-1.5 p-3 rounded-lg bg-[var(--chip)] border border-dashed border-[var(--line)]">
          <div className="mono flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-[var(--muted)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
              {statusMessage || "Preparing data stream..."}
            </span>
            <span className="text-[var(--faint)]">{downloadProgress}%</span>
          </div>
          <div className="w-full h-1 rounded-full bg-[var(--line)] overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 4. Action Button */}
      <button
        onClick={handleDownload}
        disabled={downloading || (!isMultiMode && !singleVerified?.valid) || (isMultiMode && symbols.length === 0)}
        className="w-full py-3.5 px-6 rounded-full bg-[var(--text)] text-[var(--bg)] font-semibold text-xs sm:text-sm hover:opacity-90 hover:-translate-y-px active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {downloading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Streaming & Packaging Datasets...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>
              Download {isMultiMode ? `${activeCount} Coins` : singleSymbol} ({activeDatasetCount} {activeDatasetCount === 1 ? 'Dataset' : 'Datasets'})
            </span>
          </>
        )}
      </button>

      {/* Output format badge */}
      <div className="mono flex items-center justify-center gap-2 text-[11px] text-[var(--faint)]">
        {activeDatasetCount > 1 ? (
          <>
            <FileArchive className="w-3.5 h-3.5 text-emerald-500" />
            <span>Bundles into a clean structured .ZIP archive containing all individual CSVs</span>
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Direct .CSV file with full OHLCV, Volume & Trade count headers</span>
          </>
        )}
      </div>

    </div>
  )
}
