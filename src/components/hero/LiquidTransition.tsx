import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react'
import gsap from 'gsap'
import WaveShape from '../../assets/svg/transition-wave.svg?react'
import styles from './LiquidTransition.module.css'

export interface LiquidTransitionHandle {
  /** Plays the rise-and-reveal sequence once. `onCovered` fires the instant
   *  the wave has fully risen into its designed position (screen fully
   *  covered) — the caller must do its scroll-snap SYNCHRONOUSLY inside
   *  this callback, since the overlay is hidden immediately after it
   *  returns (no fade — the striped fill underneath IS About's own
   *  background from that point on, not a temporary copy that needs to
   *  visibly disappear). The returned promise resolves right after. */
  play: (onCovered?: () => void) => Promise<void>
}

// 1000ms, `power3.out` — fast start easing smoothly to a stop, one notch
// gentler than `expo.out` (which read as too sharp/fast at 600ms).
const RISE_DURATION = 1
// The wave's own artwork (viewBox 0 0 1920 1080, "as designed") does NOT
// cover the full canvas at y=0 — it's a splash with a jagged crest sitting
// mid-height, only filled solid BELOW that crest. Confirmed empirically
// (`getBBox` on mask content reports nothing useful — measured live via
// screenshots instead): the group needs to rise to y=-550 for the crest to
// clear above any viewport this project targets, not y=0. `RISE_FROM_Y`
// (start, hidden) and `RISE_TO_Y` (end, fully covering) are both relative
// to that native "as designed" position.
const RISE_FROM_Y = 1400
const RISE_TO_Y = -550

export default forwardRef<LiquidTransitionHandle>(function LiquidTransition(_props, ref) {
  const uid = useId()
  const filterId = `liquid-wobble-${uid}`
  const maskId = `liquid-mask-${uid}`
  const patternId = `liquid-stripe-${uid}`
  const patternRef = useRef<SVGPatternElement>(null)
  const overlayRef = useRef<SVGGElement>(null)
  const waveGroupRef = useRef<SVGGElement>(null)
  const displaceRef = useRef<SVGFEOffsetElement>(null)
  // `play()` starts an rAF loop + an infinite `repeat:-1` tween that are
  // both normally only ever stopped from the rise tween's own `onComplete`
  // — tracked here too so an unmount effect can stop them even if the
  // component unmounts mid-rise (e.g. a browser-history navigation away
  // from `/` during the ~1s transition), which would otherwise leave them
  // running forever against a detached SVG node.
  const wobbleRafRef = useRef(0)
  const jiggleTweenRef = useRef<gsap.core.Tween | null>(null)
  const riseTweenRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    return () => {
      cancelAnimationFrame(wobbleRafRef.current)
      jiggleTweenRef.current?.kill()
      riseTweenRef.current?.kill()
    }
  }, [])

  // Scrolling stripe pattern — same rAF-driven `patternTransform`
  // technique as StripedBackground (see that file for why: SMIL/CSS
  // background-position both have reliability issues here). Reimplemented
  // inline rather than reusing the component since it needs to be a fill
  // SOURCE for the masked rect below, not a standalone full-bleed layer.
  // Coordinates are in the wave artwork's own native 1920x1080 space.
  useEffect(() => {
    const pattern = patternRef.current
    if (!pattern) return
    const w = 70
    const gap = 70
    const period = w + gap
    const durationMs = 20000
    const start = performance.now()
    let rafId: number
    const tick = (now: number) => {
      const elapsed = (now - start) % durationMs
      const offset = (elapsed / durationMs) * period
      // rotate(-20), matching StripedBackground's `rotation = -angle` —
      // this was wrongly `rotate(20)` (sign flipped) before, which made
      // the liquid's stripes run the opposite diagonal from every other
      // striped background on the site (Hero/About/Navbar all go through
      // that same negation).
      pattern.setAttribute('patternTransform', `rotate(-20) translate(${offset} 0)`)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  useImperativeHandle(ref, () => ({
    play: (onCovered) =>
      new Promise((resolve) => {
        gsap.set(overlayRef.current, { opacity: 1 })
        gsap.set(waveGroupRef.current, { y: RISE_FROM_Y, scaleX: 1, scaleY: 1, transformOrigin: '50% 100%' })
        gsap.set(displaceRef.current, { attr: { dx: 0, dy: 0 } })

        // The noise field itself is computed ONCE (cheap) — only its
        // OFFSET is animated via a plain rAF loop (feOffset shifting
        // pixels is cheap, unlike re-deriving feTurbulence every frame),
        // which drags a fixed noise pattern sideways through the
        // displacement map so the wave's edge keeps rippling/boiling
        // for the whole rise instead of holding one static warp. Bumped
        // much stronger than the first attempt (which read as "just
        // translating," per explicit feedback) — both the displacement
        // amplitude here and `scale` on the filter below.
        // Frequencies tuned against the 1000ms rise window.
        const wobbleStart = performance.now()
        const tickWobble = (now: number) => {
          const elapsed = (now - wobbleStart) / 1000
          displaceRef.current?.setAttribute('dx', String(Math.sin(elapsed * 5) * 90))
          displaceRef.current?.setAttribute('dy', String(elapsed * 120))
          wobbleRafRef.current = requestAnimationFrame(tickWobble)
        }
        wobbleRafRef.current = requestAnimationFrame(tickWobble)

        // Squash/stretch on top of the rise — the SHAPE itself jiggles
        // (wider+shorter, then narrower+taller, alternating) as it moves,
        // like gelatin, not just a rigid translate. `transformOrigin`
        // pinned to the bottom so the squash reads as the mass wobbling
        // while its base stays put, not the whole thing sliding sideways.
        jiggleTweenRef.current = gsap.to(waveGroupRef.current, {
          scaleX: 1.035,
          scaleY: 0.965,
          duration: 0.22,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        })

        riseTweenRef.current = gsap.to(waveGroupRef.current, {
          y: RISE_TO_Y,
          duration: RISE_DURATION,
          ease: 'power3.out',
          onComplete: () => {
            cancelAnimationFrame(wobbleRafRef.current)
            jiggleTweenRef.current?.kill()
            gsap.set(waveGroupRef.current, { scaleX: 1, scaleY: 1 })
            // Caller's scroll-snap runs SYNCHRONOUSLY inside onCovered —
            // by the time it returns, the jump has already happened, so
            // hiding the overlay right after (no fade) is a seamless
            // swap: what was showing (striped purple) is now what's
            // really there underneath (About's own background), not a
            // different thing being revealed.
            onCovered?.()
            gsap.set(overlayRef.current, { opacity: 0 })
            resolve()
          },
        })
      }),
  }))

  return (
    <svg
      className={styles.svg}
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        {/* Edge wobble ("méo rìa động") — NOT a color/turbulence-fill
            effect like the earlier navbar-glass attempt, just a
            displacement of this one shape's own alpha silhouette, so
            it's far more contained/predictable: worst case is a wobblier
            or straighter edge, never a muddy color result. */}
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.0025 0.006" numOctaves="2" seed="7" result="noise" />
          <feOffset ref={displaceRef} in="noise" dx="0" dy="0" result="shiftedNoise" />
          <feDisplacementMap in="SourceGraphic" in2="shiftedNoise" scale="130" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <pattern
          ref={patternRef}
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={140}
          height={140}
          patternTransform="rotate(-20)"
        >
          <rect width="100%" height="100%" fill="var(--ink-purple)" />
          <rect width={70} height={140} fill="var(--stripe-purple)" />
        </pattern>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={-200} y={-800} width={2320} height={3280}>
          <g ref={waveGroupRef} filter={`url(#${filterId})`}>
            {/* `overflow: visible` — a nested <svg> clips content outside
                its OWN viewBox by default, which was silently cutting off
                the path's extended bottom margin (needed so the shape
                still fully covers once translated well past its resting
                position — see the SVG source comment). */}
            <WaveShape x={0} y={0} width={1920} height={1080} style={{ overflow: 'visible' }} />
          </g>
        </mask>
      </defs>
      <g ref={overlayRef} className={styles.group}>
        <rect x={-200} y={-800} width={2320} height={3280} fill={`url(#${patternId})`} mask={`url(#${maskId})`} />
      </g>
    </svg>
  )
})
