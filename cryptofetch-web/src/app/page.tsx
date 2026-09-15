import DownloaderCard from '@/components/DownloaderCard'
import Header from '@/components/Header'
import { Zap, Database, ArrowDownToLine, Clock, ShieldCheck, Terminal } from 'lucide-react'
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern'
import { cn } from '@/lib/utils'

export default function HomePage() {
  return (
    <div className="min-h-screen lg:h-screen transition-colors duration-300 relative flex flex-col justify-between overflow-x-hidden lg:overflow-hidden bg-white dark:bg-[#0b0b0b]">
      {/* Animated Grid Pattern Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <AnimatedGridPattern
          numSquares={55}
          maxOpacity={0.6}
          duration={2.5}
          repeatDelay={0.5}
          width={44}
          height={44}
          style={{
            WebkitMaskImage: "radial-gradient(900px circle at center, white 20%, transparent 90%)",
            maskImage: "radial-gradient(900px circle at center, white 20%, transparent 90%)",
          }}
          className={cn(
            "inset-x-0 inset-y-[-30%] h-[200%] w-full skew-y-12"
          )}
        />
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        <Header />

        {/* 2-Column Wide Layout (Zero scroll on Desktop) */}
        <main className="w-full max-w-[84rem] mx-auto px-6 py-4 md:py-6 lg:py-4 flex-1 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
            
            {/* Left Column: Hero & Key Specs */}
            <div className="lg:col-span-5 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100/90 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 text-xs font-semibold text-zinc-800 dark:text-zinc-200 backdrop-blur-md shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Direct Binance Public Stream</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white leading-[1.1]">
                  Historical Crypto Data
                </h1>
                <p className="text-2xl sm:text-3xl lg:text-4xl text-zinc-500 dark:text-zinc-400 font-normal">
                  Downloaded in seconds.
                </p>
              </div>

              <p className="text-lg text-zinc-700 dark:text-zinc-200 leading-relaxed max-w-lg">
                Export high-resolution OHLCV candlestick data directly to clean CSVs. No API keys required, no rate limit restrictions, and completely free.
              </p>

              {/* Key feature highlights */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-md space-y-1">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">15 Intervals</div>
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">1m to 1M bars</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-md space-y-1">
                  <Database className="w-4 h-4 text-blue-500" />
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">500+ Pairs</div>
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">All USDT assets</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-md space-y-1">
                  <ArrowDownToLine className="w-4 h-4 text-emerald-500" />
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">Instant CSV</div>
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">Backtest ready</div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Downloader Card */}
            <div className="lg:col-span-7 flex justify-center lg:justify-end">
              <DownloaderCard />
            </div>

          </div>
        </main>

        {/* Enhanced Modern Footer */}
        <footer className="w-full border-t border-zinc-200/80 dark:border-zinc-800/80 py-3.5 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md shrink-0">
          <div className="max-w-[84rem] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Binance Vision API v3</span>
              <span className="text-zinc-400 dark:text-zinc-600">·</span>
              <span>100% Free & Open Source</span>
            </div>

            <div className="flex items-center gap-4">
              <span>
                Crafted by{" "}
                <a
                  href="https://varshith.me"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-zinc-900 dark:text-white hover:underline transition-colors"
                >
                  Varshith Karkera
                </a>
              </span>
              <span className="text-zinc-400 dark:text-zinc-600">·</span>
              <a
                href="https://github.com/varshithkarkera/cryptofetch"
                target="_blank"
                rel="noreferrer"
                className="hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                cryptofetch CLI
              </a>
              <span className="text-zinc-400 dark:text-zinc-600">·</span>
              <a
                href="https://buymeacoffee.com/varshithkarkera"
                target="_blank"
                rel="noreferrer"
                className="hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                buymeacoffee.com/varshithkarkera
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
