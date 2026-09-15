"use client"

import { useEffect, useId, useRef, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedGridPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number
  height?: number
  x?: number
  y?: number
  strokeDasharray?: any
  numSquares?: number
  className?: string
  maxOpacity?: number
  duration?: number
  repeatDelay?: number
}

export function AnimatedGridPattern({
  width = 44,
  height = 44,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 60,
  className,
  maxOpacity = 0.85,
  duration = 2.5,
  repeatDelay = 0.2,
  ...props
}: AnimatedGridPatternProps) {
  const id = useId()
  const containerRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  const getPos = () => {
    return [
      Math.floor((Math.random() * (dimensions.width || 1200)) / width),
      Math.floor((Math.random() * (dimensions.height || 800)) / height),
    ]
  }

  const generateSquares = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      pos: getPos(),
    }))
  }

  const [squares, setSquares] = useState<Array<{ id: number; pos: number[] }>>([])

  const updateSquarePosition = (id: number) => {
    setSquares((currentSquares) =>
      currentSquares.map((sq) =>
        sq.id === id
          ? {
              ...sq,
              pos: getPos(),
            }
          : sq
      )
    )
  }

  useEffect(() => {
    if (dimensions.width && dimensions.height) {
      setSquares(generateSquares(numSquares))
    }
  }, [dimensions, numSquares])

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current)
      }
    }
  }, [containerRef])

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full stroke-zinc-400/80 dark:stroke-zinc-700/80 fill-none",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeWidth="1.2"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <svg x={x} y={y} className="overflow-visible">
        {squares.map(({ pos: [x, y], id }, index) => (
          <motion.rect
            key={`${x}-${y}-${id}-${index}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: [0, maxOpacity, 0],
              scale: [0.85, 1, 0.85],
            }}
            transition={{
              duration: duration + (index % 4) * 0.4,
              repeat: Infinity,
              delay: (index % 12) * 0.25,
              ease: "easeInOut",
            }}
            onAnimationComplete={() => updateSquarePosition(id)}
            width={width - 1}
            height={height - 1}
            x={x * width + 1}
            y={y * height + 1}
            className="fill-emerald-600/70 dark:fill-emerald-400/60 transition-colors"
            strokeWidth="0"
          />
        ))}
      </svg>
    </svg>
  )
}
export default AnimatedGridPattern
