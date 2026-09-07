import type { CSSProperties, ReactNode } from 'react'
import { useId } from 'react'
import styles from './StripedBackground.module.css'

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
  /**
   * Unused — the stripes are static now (see the module comment below).
   * Kept only so every existing call site (Hero/About/Work/Contact/
   * Navbar's hover chip/LoadingScreen/CaseStudyPage) doesn't need editing
   * just to drop a prop that no longer does anything.
   */
  speed?: number
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

// Static diagonal stripes — deliberately NOT animated (2026-09-07, direct
// user request after tracing his own site's lag to this: "the colored
// stripes are fine, just stop them moving"). This project went through 3
// increasingly elaborate animated versions before landing here (plain CSS
// gradient → SVG pattern + SMIL → SVG pattern + rAF → SVG pattern + a
// compositor-only CSS `transform` animation — see [[striped-background-
// pattern]] for the full history of why each earlier one was replaced) —
// all of that is now moot: an animation that never runs costs nothing on
// any engine, which beats even the cheapest possible moving version. If
// motion is ever wanted back, the CSS-transform version (with its
// `rotate(R) translateX(offset) rotate(-R)` cancel-trick and shared-epoch
// phase lock) is preserved in git history rather than reconstructed from
// scratch — don't rebuild any of the animated approaches without a fresh
// explicit ask.
export default function StripedBackground({
  bg,
  stripe,
  angle = -20,
  stripeWidth = 60,
  gap = 60,
  className,
  style: styleProp,
  children,
}: StripedBackgroundProps) {
  const patternId = `sb-pattern-${useId()}`
  const resolvedStripe = stripe ?? `color-mix(in srgb, ${bg} 80%, black)`

  // Fixed at all viewport sizes (no responsive halving below 768px) — the
  // Hero is desktop-first for now (see project memory), so there's no
  // responsive stripe density to preserve yet.
  const w = stripeWidth
  const g = gap
  const period = w + g
  const rotation = -angle

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')} style={styleProp}>
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
        <rect x={0} y={0} width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
      {children && <div className={styles.content}>{children}</div>}
    </div>
  )
}
