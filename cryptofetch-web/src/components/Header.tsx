"use client"

import React, { useState, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { Star, ArrowUpRight, Coffee } from 'lucide-react'
import Link from 'next/link'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

export default function Header() {
  const { theme } = useTheme()
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    // Fetch GitHub repository stars count
    fetch("https://api.github.com/repos/varshithkarkera/cryptofetch")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.stargazers_count === "number") {
          setStars(data.stargazers_count)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <header className="w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50 transition-colors">
      <div className="max-w-[84rem] mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* Pure League Spartan Typography Wordmark */}
          <div className="flex items-baseline gap-2 transition-transform group-hover:scale-[1.02]">
            <span
              style={{ fontFamily: "var(--font-spartan), sans-serif" }}
              className="text-3xl md:text-4xl font-extrabold tracking-tight text-black dark:text-white lowercase select-none"
            >
              cryptofetch
            </span>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 self-center">
              Live
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Buy Me a Coffee */}
          <a
            href="https://buymeacoffee.com/varshithkarkera"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors shadow-2xs"
            title="Buy me a coffee"
          >
            <Coffee className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">Buy me a coffee</span>
            <ArrowUpRight className="w-3 h-3 text-zinc-400 -ml-0.5" />
          </a>

          {/* GitHub Star button with live count */}
          <a
            href="https://github.com/varshithkarkera/cryptofetch"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors shadow-2xs"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GitHub</span>
            <span className="flex items-center gap-1 pl-1.5 border-l border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{stars !== null ? stars : "★"}</span>
            </span>
            <ArrowUpRight className="w-3 h-3 text-zinc-400 -ml-0.5" />
          </a>

          <div className="border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
            <AnimatedThemeToggler />
          </div>
        </div>
      </div>
    </header>
  )
}
