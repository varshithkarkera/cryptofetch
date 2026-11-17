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
    <div className="w-full max-w-2xl rounded-2xl bg-white/90 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-md p-6 sm:p-7 shadow-sm space-y-5">
      
      {/* 0. Data source */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider block">Exchange</label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Exchange">
          {EXCHANGES.map((e) => (
            <button
              key={e.id}
              role="radio"
              aria-checked={e.id === exchangeId}
              disabled={downloading}
              onClick={() => switchExchange(e.id)}
              className={`text-xs sm:text-sm px-3.5 py-1.5 rounded-xl border font-semibold transition-all duration-150 cursor-pointer ${
                e.id === exchangeId
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs"
                  : "bg-zinc-100/90 dark:bg-zinc-900/60 border-zinc-300/80 dark:border-zinc-800/80 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200/90 dark:hover:bg-zinc-800/70"
              }`}
            >
              {e.name}
            </button>
          ))}
        </div>
        {ex.note && <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">{ex.note}</p>}
      </div>

      {/* 1. Header with Mode Switch */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider block">
            {isMultiMode ? `Selected Cryptos (${symbols.length})` : "Cryptocurrency Symbol"}
          </label>

          {/* Mode Switch Button */}
          <button
            type="button"
            onClick={() => setIsMultiMode(!isMultiMode)}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              isMultiMode
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-xs"
                : "bg-zinc-100/90 dark:bg-zinc-800/80 border-zinc-300/80 dark:border-zinc-700/80 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            <Layers className="w-3 h-3 text-emerald-500" />
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
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-950/80 border border-zinc-300 dark:border-zinc-800 text-black dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all uppercase placeholder:normal-case placeholder:text-zinc-400"
              />
              
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {singleVerifying && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />}
                {!singleVerifying && singleVerified?.valid && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
                {!singleVerifying && singleVerified && !singleVerified.valid && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-semibold border border-red-500/30">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Invalid Pair
                  </span>
                )}
              </div>
            </div>

            {/* Live price tag */}
            {singleVerified?.valid && (
              <div className="flex items-center gap-3 text-xs text-zinc-700 dark:text-zinc-300 pt-1.5">
                <span className="flex items-center gap-1">
                  <span className="text-zinc-500 dark:text-zinc-400">Price:</span>
                  <span className="font-bold text-black dark:text-white">
                    ${singleVerified.price}
                  </span>
                </span>
                <span className={`font-bold ${Number(singleVerified.change) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {Number(singleVerified.change) >= 0 ? "+" : ""}{singleVerified.change}% (24h)
                </span>
              </div>
            )}

            {/* Quick popular coins */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mr-1">Popular:</span>
              {POPULAR_COINS.map((coin) => (
                <button
                  key={coin}
                  onClick={() => setSingleSymbol(symbolOf(coin))}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    isDefaultCoin(singleSymbol, coin)
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent font-bold shadow-xs"
                      : "bg-zinc-100/90 dark:bg-zinc-800/60 border-zinc-300/80 dark:border-zinc-700/80 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium"
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
            <div className="flex flex-wrap gap-2 items-center min-h-10 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800">
              {symbols.map((sym) => {
                return (
                  <span
                    key={sym}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold shadow-xs"
                  >
                    <span>{sym}</span>
                    {symbols.length > 1 && (
                      <button
                        onClick={() => removeMultiSymbol(sym)}
                        className="p-0.5 hover:bg-zinc-700 dark:hover:bg-zinc-200 rounded-full transition-colors cursor-pointer ml-0.5"
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
                  className="w-full bg-transparent px-2 py-1 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none uppercase"
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
              <span className="text-xs text-zinc-400 mr-1">Quick Add:</span>
              {POPULAR_COINS.map((coin) => {
                const isAdded = symbols.some((sx) => isDefaultCoin(sx, coin))
                return (
                  <button
                    key={coin}
                    onClick={() => {
                      if (isAdded) removeMultiSymbol(symbols.find((sx) => isDefaultCoin(sx, coin))!)
                      else addMultiSymbol(coin)
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      isAdded
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent font-semibold shadow-xs"
                        : "bg-zinc-100/80 dark:bg-zinc-800/60 border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
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

      <hr className="border-zinc-200/80 dark:border-zinc-800/80 my-1" />

      {/* 2. Candle Intervals Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider block">
            Candle Intervals ({selectedIntervals.length} selected)
          </label>
          <button
            onClick={selectAllIntervals}
            className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer font-medium"
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
                className={`${!supported ? "opacity-30 line-through cursor-not-allowed " : ""}text-xs sm:text-sm px-3.5 py-1.5 rounded-xl border font-semibold transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs scale-105"
                    : "bg-zinc-100/90 dark:bg-zinc-900/60 border-zinc-300/80 dark:border-zinc-800/80 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200/90 dark:hover:bg-zinc-800/70"
                }`}
              >
                {intv.label}
              </button>
            )
          })}
        </div>
      </div>

      <hr className="border-zinc-200/80 dark:border-zinc-800/80 my-1" />

      {/* 3. Date Range Selection with Enhanced Padding & Container */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider block">
            Historical Date Range
          </label>
          <div className="flex items-center gap-1 text-xs text-zinc-500 font-medium">
            <span className="hidden sm:inline mr-0.5">Presets:</span>
            <button onClick={() => setPresetRange(7)} className="px-2 py-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-300 cursor-pointer transition-colors">7D</button>
            <button onClick={() => setPresetRange(30)} className="px-2 py-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-300 cursor-pointer transition-colors">30D</button>
            <button onClick={() => setPresetRange(180)} className="px-2 py-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-300 cursor-pointer transition-colors">6M</button>
            <button onClick={() => setPresetRange(365)} className="px-2 py-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-300 cursor-pointer transition-colors">1Y</button>
            <button onClick={() => setPresetRange(365 * 3)} className="px-2 py-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-300 cursor-pointer transition-colors">3Y</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-[11px] text-zinc-700 dark:text-zinc-300 font-semibold">Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-black dark:text-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] text-zinc-700 dark:text-zinc-300 font-semibold">End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-black dark:text-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Progress feedback bar */}
      {downloading && (
        <div className="space-y-1.5 p-3 rounded-xl bg-zinc-100/90 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
              {statusMessage || "Preparing data stream..."}
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">{downloadProgress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
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
        className="w-full py-3.5 px-6 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-xs sm:text-sm hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
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
      <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
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
