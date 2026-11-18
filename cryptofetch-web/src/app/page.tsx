import DownloaderCard from '@/components/DownloaderCard'
import Header from '@/components/Header'
import { Zap, Database, ArrowDownToLine, ArrowUpRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-300">
      <Header />

      <div className="wrap pt-12">
        {/* Hero */}
        <section className="px-5 pt-12 pb-10 sm:px-8 sm:pt-16 sm:pb-12">
          <div className="inline-flex items-center gap-2 mono text-[10px] font-medium uppercase tracking-[.14em] text-[var(--faint)] border border-dashed border-[var(--line2)] rounded-[4px] px-2 py-1">
            <span className="pulse-dot" />
            Direct public exchange streams
          </div>

          <h1 className="serif text-[42px] sm:text-[56px] leading-[1.05] mt-6">
            Historical crypto data,
            <br />
            <span className="italic text-[var(--muted)]">downloaded in seconds.</span>
          </h1>

          <p className="text-[15px] sm:text-base text-[var(--muted)] leading-relaxed max-w-xl mt-5">
            Export high-resolution OHLCV candlestick data directly to clean CSVs.
            No API keys, no sign-up, and completely free. Pick Binance, OKX,
            Coinbase, Bitget or Gate.
          </p>

          {/* Key feature highlights: dashed strip */}
          <div className="grid grid-cols-3 mt-9 border border-dashed border-[var(--line)] rounded-lg overflow-hidden">
            <div className="p-4 sm:p-5 space-y-1.5">
              <Zap className="w-4 h-4 text-[var(--faint)]" />
              <div className="text-[13px] font-semibold text-[var(--text)]">Up to 15 intervals</div>
              <div className="mono text-[11px] text-[var(--faint)]">1m to 1M bars</div>
            </div>
            <div className="p-4 sm:p-5 space-y-1.5 border-l border-dashed border-[var(--line)]">
              <Database className="w-4 h-4 text-[var(--faint)]" />
              <div className="text-[13px] font-semibold text-[var(--text)]">5 exchanges</div>
              <div className="mono text-[11px] text-[var(--faint)]">Hundreds of pairs</div>
            </div>
            <div className="p-4 sm:p-5 space-y-1.5 border-l border-dashed border-[var(--line)]">
              <ArrowDownToLine className="w-4 h-4 text-[var(--faint)]" />
              <div className="text-[13px] font-semibold text-[var(--text)]">Instant CSV</div>
              <div className="mono text-[11px] text-[var(--faint)]">Backtest ready</div>
            </div>
          </div>
        </section>

        <div className="band" />

        {/* Downloader */}
        <section className="px-5 py-10 sm:px-8 sm:py-12">
          <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
            <h2 className="serif text-[30px]">Build your dataset</h2>
            <span className="mono text-[11px] text-[var(--faint)] tracking-[.08em]">STREAMED STRAIGHT TO YOUR BROWSER</span>
          </div>
          <DownloaderCard />
        </section>

        <div className="rule" />

        {/* Footer */}
        <footer className="px-5 sm:px-8 py-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mono text-[11px] tracking-[.06em] text-[var(--faint)] flex-wrap">
            <span className="pulse-dot" />
            <span className="text-[var(--muted)]">Binance · OKX · Coinbase · Bitget · Gate public APIs</span>
            <span>·</span>
            <span>100% Free &amp; Open Source</span>
          </div>
          <div className="text-[13px] text-[var(--faint)]">
            Crafted by{" "}
            <a
              href="https://varshith.me"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              Varshith Karkera
            </a>
            {" "}·{" "}
            <a
              href="https://github.com/varshithkarkera/cryptofetch"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              Source on GitHub
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}
