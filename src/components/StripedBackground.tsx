import { useEffect, useId, useRef } from 'react'
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
  const patternRef = useRef<SVGPatternElement>(null)
  const resolvedStripe = stripe ?? `color-mix(in srgb, ${bg} 80%, black)`
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  // Fixed at all viewport sizes (no responsive halving below 768px) — the
  // Hero is desktop-first for now (see project memory), so there's no
  // responsive stripe density to preserve yet.
  const w = stripeWidth
  const g = gap
  const period = w + g
  const rotation = -angle

  // Drawn as an SVG <pattern> of plain VERTICAL bars, tilted with
  // patternTransform, rather than a CSS repeating-linear-gradient — a
  // gradient painted across the whole hero is prone to a GPU texture-wrap
  // defect on some drivers where large animated gradients visibly fold
  // into a mirrored "V" instead of repeating cleanly.
  //
  // The scroll is driven by a plain requestAnimationFrame loop writing
  // `patternTransform` directly, not SMIL `<animateTransform>` — SMIL's
  // browser support for long-running animations is inconsistent enough
  // that it isn't trusted here for something that needs to loop
  // indefinitely without degrading.
  useEffect(() => {
    if (reduceMotion) return
    const pattern = patternRef.current
    if (!pattern) return
    const durationMs = speed * 1000
    let rafId: number
    const tick = (now: number) => {
      const elapsed = (now - SHARED_PATTERN_EPOCH) % durationMs
      const offset = (elapsed / durationMs) * period
      pattern.setAttribute('patternTransform', `rotate(${rotation}) translate(${offset} 0)`)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [reduceMotion, speed, period, rotation])

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')} style={styleProp}>
      <svg className={styles.stripes} aria-hidden="true">
        <defs>
          <pattern
            ref={patternRef}
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
        <rect x={0} y={0} width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
      {children && <div className={styles.content}>{children}</div>}
    </div>
  )
}
