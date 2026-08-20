import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import styles from './StripedBackground.module.css'

// Module-scope, not per-instance — every StripedBackground on the page
// shares this ONE timestamp instead of each computing its own
// `performance.now()` at its own mount time, so instances using the
// shared angle/width/gap/speed convention stay phase-locked with each
// other and the diagonal stripes read as one continuous field across a
// section boundary instead of jumping out of alignment at the seam.
const SHARED_PATTERN_EPOCH = performance.now()

interface StripedBackgroundProps {
  /** Base background color (any valid CSS color, incl. var(--token)). */
  bg: string
  /** Stripe color. Defaults to an auto-darkened shade of `bg` when omitted. */
  stripe?: string
  /**
   * Stripe tilt, in degrees measured from VERTICAL (matches the Figma
   * source: plain vertical bars rotated by this amount). Splatoon default: -20.
   */
  angle?: number
  /** Width of each stripe, in px (desktop reference — halved under 768px). */
  stripeWidth?: number
  /** Gap between stripes, in px (desktop reference — halved under 768px). */
  gap?: number
  /** Seconds for one full loop of the scroll animation. */
  speed?: number
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export default function StripedBackground({
  bg,
  stripe,
  angle = -20,
  stripeWidth = 60,
  gap = 60,
  speed = 18,
  className,
  style: styleProp,
  children,
}: StripedBackgroundProps) {
  const patternId = `sb-pattern-${useId()}`
  const wrapRef = useRef<HTMLDivElement>(null)
  const resolvedStripe = stripe ?? `color-mix(in srgb, ${bg} 80%, black)`
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  // Starts true so the very first paint (before the observer's first
  // callback lands) still animates instead of momentarily freezing — most
  // instances mount already in or near the viewport anyway.
  const [isVisible, setIsVisible] = useState(true)

  // Fixed at all viewport sizes (no responsive halving below 768px) — the
  // Hero is desktop-first for now (see project memory), so there's no
  // responsive stripe density to preserve yet.
  const w = stripeWidth
  const g = gap
  const period = w + g
  const rotation = -angle

  // A negative `animation-delay` "seeks" the CSS animation to wherever it
  // would already be if it had been running since the shared epoch —
  // computed ONCE (not every frame, unlike the old rAF version) and left
  // alone; pausing/resuming via `animation-play-state` below preserves
  // this seek natively (the browser remembers the animation's current
  // time across a pause), so instances don't need to re-derive it.
  const animationDelay = useMemo(() => {
    const elapsed = (performance.now() - SHARED_PATTERN_EPOCH) % (speed * 1000)
    return `-${elapsed}ms`
  }, [speed])

  // Paused whenever this instance scrolls out of view — with ~7 of these
  // mounted on the home page at once, a moving background running
  // indefinitely (even off-screen) is a real, measured CPU cost on
  // Safari specifically. See the `.stripesFill` comment in the CSS module
  // for why this no longer costs anything even while genuinely running.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      rootMargin: '200px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const fillStyle = {
    '--sb-rotation': `${rotation}deg`,
    '--sb-period': `${period}px`,
    animationDuration: `${speed}s`,
    animationDelay,
    animationPlayState: reduceMotion || !isVisible ? 'paused' : 'running',
  } as CSSProperties

  return (
    <div ref={wrapRef} className={[styles.wrap, className].filter(Boolean).join(' ')} style={styleProp}>
      <svg className={styles.stripes} aria-hidden="true">
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={period}
            height={period}
            patternTransform={`rotate(${rotation})`}
          >
            <rect x={0} y={0} width={w} height={period} fill={resolvedStripe} />
          </pattern>
        </defs>
        <rect x={0} y={0} width="100%" height="100%" fill={bg} />
        <rect x="-25%" y="-25%" width="150%" height="150%" fill={`url(#${patternId})`} className={styles.stripesFill} style={fillStyle} />
      </svg>
      {children && <div className={styles.content}>{children}</div>}
    </div>
  )
}
