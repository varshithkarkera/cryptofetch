"use client"

import React, { useState, useEffect } from 'react'
import { Star, ArrowUpRight, Coffee } from 'lucide-react'
import Link from 'next/link'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

export default function Header() {
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
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
    <header className="fixed top-0 inset-x-0 z-50 border-b border-dashed border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur-[10px]">
      <div className="max-w-[56rem] mx-auto h-12 flex items-center justify-between px-4 border-l border-r border-dashed border-[var(--line)]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="serif text-[24px] leading-none select-none text-[var(--text)]">
            cryptofetch
          </span>
          <span className="mono inline-flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[.1em] px-1.5 py-[3px] rounded-[4px] border border-dashed border-[var(--line2)] text-[var(--faint)]">
            <span className="pulse-dot" />
            Live
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Buy Me a Coffee */}
          <a
            href="https://buymeacoffee.com/varshithkarkera"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed border-[var(--line2)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors"
            title="Buy me a coffee"
          >
            <Coffee className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Buy me a coffee</span>
            <ArrowUpRight className="w-3 h-3 text-[var(--faint)] -ml-0.5" />
          </a>

          {/* GitHub Star button with live count */}
          <a
            href="https://github.com/varshithkarkera/cryptofetch"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed border-[var(--line2)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GitHub</span>
            <span className="mono flex items-center gap-1 pl-1.5 border-l border-dashed border-[var(--line2)] text-[var(--muted)]">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{stars !== null ? stars : "-"}</span>
            </span>
          </a>

          <div className="rounded-lg border border-dashed border-[var(--line2)] p-0.5 hover:bg-[var(--hover)] transition-colors">
            <AnimatedThemeToggler />
          </div>
        </div>
      </div>
    </header>
  )
}
