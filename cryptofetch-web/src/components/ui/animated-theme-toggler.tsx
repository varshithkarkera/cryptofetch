"use client"

import React, { useCallback, useRef } from "react"
import { Moon, Sun } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { flushSync } from "react-dom"
import { useTheme } from "@/context/ThemeContext"
import { cn } from "@/lib/utils"

export interface AnimatedThemeTogglerProps
  extends React.ComponentPropsWithoutRef<"button"> {
  className?: string
  duration?: number
}

export function AnimatedThemeToggler({
  className,
  duration = 500,
  ...props
}: AnimatedThemeTogglerProps) {
  const { theme, toggleTheme } = useTheme()
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleToggle = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      // Check if browser supports View Transitions API
      if (typeof document === "undefined" || !("startViewTransition" in document)) {
        toggleTheme()
        return
      }

      const rect = buttonRef.current?.getBoundingClientRect() ?? {
        left: event.clientX,
        top: event.clientY,
        width: 0,
        height: 0,
      }

      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2

      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      )

      const transition = (document as any).startViewTransition(() => {
        flushSync(() => {
          toggleTheme()
        })
      })

      try {
        await transition.ready

        const clipPath = [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ]

        document.documentElement.animate(
          {
            clipPath: clipPath,
          },
          {
            duration,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          }
        )
      } catch (e) {
        // Fallback in case of any animation interruption
      }
    },
    [toggleTheme, duration]
  )

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleToggle}
      className={cn(
        "relative flex items-center justify-center p-2 rounded-full transition-colors focus:outline-none",
        "hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60",
        className
      )}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.div
            key="sun"
            initial={{ scale: 0.5, rotate: -90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.5, rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
          >
            <Sun className="w-5 h-5 text-amber-400 group-hover/icon:text-amber-300 transition-colors" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ scale: 0.5, rotate: 90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.5, rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
          >
            <Moon className="w-5 h-5 text-neutral-900 dark:text-white group-hover/icon:text-neutral-500 dark:group-hover/icon:text-neutral-400 transition-colors" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
