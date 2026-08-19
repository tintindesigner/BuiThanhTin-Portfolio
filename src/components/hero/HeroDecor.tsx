import { Suspense, forwardRef, lazy, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import Burst from '../../assets/svg/burst-icon.svg?react'
import BuyOneGetAll from '../../assets/svg/buy-1-get-all.svg?react'
import ClickIcon from '../../assets/svg/click-to-unbox.svg?react'
import AdvertisingIcon from '../../assets/svg/advertising-icon.svg?react'
import AiGenerativeIcon from '../../assets/svg/ai-generative-icon.svg?react'
import MotionGraphicIcon from '../../assets/svg/motion-graphic-icon.svg?react'
import PhotoshootIcon from '../../assets/svg/photoshoot-icon.svg?react'
import Ink1 from '../../assets/svg/ink-1.svg?react'
import Ink2 from '../../assets/svg/ink-2.svg?react'
import Ink5 from '../../assets/svg/ink-5.svg?react'
import styles from './HeroDecor.module.css'

const BoxScene = lazy(() => import('./BoxScene'))

export interface HeroDecorHandle {
  /** One quick squash-bounce "nhún" on the box, e.g. right before the Hero->About transition wipe plays. */
  pulseBox: () => void
  /** Manually starts the box's bounce-in entrance (+ everything chained
   *  after it in the same timeline). Only needed when `autoPlayEntrance`
   *  is false — idempotent either way (a second call, or one after
   *  auto-play already fired, is a no-op). */
  playEntrance: () => void
}

interface HeroDecorProps {
  /** Fires when the box is clicked — the Hero->About transition trigger. */
  onBoxClick?: () => void
  /** Fires once the model has loaded + camera framing has settled —
   *  separate from the entrance TIMELINE itself (see `autoPlayEntrance`)
   *  since this one is for the loading screen deciding when it's safe to
   *  fade out, not for anything inside HeroDecor's own entrance. */
  onModelReady?: () => void
  /** When false, the box's entrance is NOT auto-triggered the instant the
   *  model finishes loading — the caller must invoke `playEntrance()` via
   *  ref instead, whenever it's actually ready to. Needed when a loading
   *  screen still covers Hero at that moment: playing the bounce-in while
   *  it's hidden behind that overlay means it's already finished (or
   *  mostly finished) by the time the overlay fades away, so the reveal
   *  shows a box that's already just sitting there. Defaults to true. */
  autoPlayEntrance?: boolean
}

const HeroDecor = forwardRef<HeroDecorHandle, HeroDecorProps>(function HeroDecor(
  { onBoxClick, onModelReady, autoPlayEntrance = true },
  ref,
) {
  const boxAnchorRef = useRef<HTMLDivElement>(null)
  const boxEntranceRef = useRef<HTMLDivElement>(null)
  const burstRef = useRef<HTMLDivElement>(null)
  const burstInkRef = useRef<HTMLDivElement>(null)
  const buyRef = useRef<HTMLDivElement>(null)
  const unboxRef = useRef<HTMLDivElement>(null)
  const badgesRef = useRef<(HTMLDivElement | null)[]>([])
  const entrancePlayedRef = useRef(false)
  // Threaded down to BoxScene as `playSpin` — its false→true edge is what
  // actually plays the 3D box's Y-axis spin, kept in sync with this same
  // DOM entrance rather than firing whenever the model happens to load.
  const [entranceTriggered, setEntranceTriggered] = useState(false)
  // Threaded down to BoxScene as `entranceSettled` — its false→true edge
  // is the REAL signal that this element's own squash/settle sequence has
  // finished, fired via `tl.call()` at the exact point in the timeline
  // (see below), so BoxScene's idle wobble can start from an actual
  // completion event instead of a separately-guessed timeout duration
  // that has to be hand-kept in sync with this timeline's own durations.
  const [entranceSettled, setEntranceSettled] = useState(false)
  // The idle "nhún nhún" tween is `repeat:-1` (infinite) — unlike every
  // other tween `startBoxEntrance` creates, it never finishes on its own,
  // so it must be explicitly killed on unmount or it keeps ticking against
  // a detached DOM node forever once this component unmounts (e.g.
  // navigating from Home to a `/work/:slug` page mid-idle-pulse).
  const idlePulseTweenRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    return () => {
      idlePulseTweenRef.current?.kill()
    }
  }, [])

  useImperativeHandle(ref, () => ({
    pulseBox: () => {
      if (!boxEntranceRef.current) return
      gsap
        .timeline()
        .to(boxEntranceRef.current, { scaleX: 0.85, scaleY: 1.2, duration: 0.15, ease: 'power2.out' })
        .to(boxEntranceRef.current, { scaleX: 1, scaleY: 1, duration: 0.35, ease: 'back.out(2.6)' })
    },
    playEntrance: () => startBoxEntrance(),
  }))

  // The whole jelly-bounce entrance — including the long travel from below
  // the actual viewport — happens as a DOM transform on this container.
  // Doing it here (not as a 3D position move inside BoxScene) means the
  // box's camera can stay tightly cropped around the resting pose without
  // ever needing headroom for the flight; a squash/stretch scale + rotate
  // on a DOM element reads the same as it would in 3D for a bounce like
  // this, without the "flies past the edge of its own camera" clipping.
  //
  // It only PLAYS once BoxScene reports the model is actually loaded and
  // rendering (`onReady`, passed below) — starting it at mount time would
  // run the animation while the lazy chunk + GLB are still downloading,
  // so the box would just pop in already mid-flight (or already landed)
  // the moment it finally has something to paint.
  //
  // Before that, this element is hidden with `opacity` ONLY — never a
  // transform (scale/translate). <Canvas> (nested a couple levels down)
  // does its first, one-time size read as it mounts, and if an ancestor
  // is mid-transform at that exact moment, that first read comes back
  // wrong (too small) — later a real browser resize (or F11) forces
  // R3F to re-measure the normal way and it snaps to the right size,
  // which is exactly the "box renders tiny until you resize" bug this
  // fixes. Opacity never affects layout/size, so it's safe pre-mount.
  //
  // Everything else in this file (burst, buy, click-prompt, badges) is
  // hidden here too: their entrance tweens only start once the box's own
  // entrance does (see startBoxEntrance), so the box is always first on
  // screen — they need to stay invisible for however long the GLB takes
  // to load, not just for their own tween's brief "from" state.
  useLayoutEffect(() => {
    const targets = [
      boxEntranceRef.current,
      unboxRef.current,
      burstRef.current,
      burstInkRef.current,
      buyRef.current,
      ...badgesRef.current,
    ].filter(Boolean)
    gsap.set(targets, { opacity: 0 })
  }, [])

  const startBoxEntrance = () => {
    if (entrancePlayedRef.current) return
    entrancePlayedRef.current = true
    setEntranceTriggered(true)
    if (!boxEntranceRef.current) return
    const el = boxEntranceRef.current
    // Only NOW (after BoxScene/<Canvas> has already mounted and measured
    // itself correctly) does this element get its first transform — the
    // squashed, off-screen starting pose for the entrance to play from.
    gsap.set(el, { y: '130vh', scaleX: 1.3, scaleY: 0.5, opacity: 1 })
    const tl = gsap.timeline()
    // Below screen, squashed → flies up, stretching into the overshoot
    // and flashing brighter mid-flight (the "blend") → a quick
    // squash-back → settles to its true 1:1 proportions. The Y-axis
    // 360° spin happens separately, as a real 3D rotation inside
    // BoxScene (see BoxScene.tsx) — a WebGL canvas inside a CSS
    // rotateY'd element doesn't composite reliably across browsers, it
    // just flattens out instead of reading as a flip.
    tl.to(el, {
      y: 0,
      scaleX: 0.82,
      scaleY: 1.28,
      filter: 'brightness(1.35)',
      duration: 0.6,
      ease: 'power2.out',
    })
    tl.to(el, {
      scaleX: 1.1,
      scaleY: 0.9,
      filter: 'brightness(1.05)',
      duration: 0.15,
      ease: 'power1.inOut',
    })
    tl.to(el, {
      scaleX: 1,
      scaleY: 1,
      filter: 'brightness(1)',
      duration: 0.3,
      ease: 'back.out(2.4)',
    })
    // Fires the instant this element's own 3 tweens above finish (real
    // signal, not a guessed duration) — BoxScene uses this false→true edge
    // to start the 3D idle wobble in sync with the DOM settle, instead of
    // a separately hand-tuned `setTimeout` that silently drifts whenever
    // this timeline's own durations change.
    tl.call(() => setEntranceSettled(true))

    // Everything else (click-prompt, burst + its ink splat, buy1getall,
    // badges) is appended to this SAME timeline, so it only starts once
    // the box's own entrance does. Staggered to match the Figma
    // prototype's relative timing: click-prompt, then burst and
    // buy1getall pop in with overshoot bounce, badges cascade last.
    if (unboxRef.current) {
      tl.fromTo(
        unboxRef.current,
        { scale: 0, x: -60, y: 30, opacity: 0 },
        { scale: 1, x: 0, y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.9)' },
        0.55,
      )
    }
    if (burstRef.current) {
      tl.fromTo(
        burstRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.32, ease: 'back.out(1.6)' },
        0.75,
      )
    }
    if (burstInkRef.current) {
      // ink-5 2 (the pink splat near the burst) pops in at the same
      // timeline position as the burst star, so they appear together —
      // its own resting opacity is 0.7 (set in CSS), not 1, so it gets
      // its own tween rather than sharing the burst's target array.
      tl.fromTo(
        burstInkRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 0.7, duration: 0.32, ease: 'back.out(1.6)' },
        0.75,
      )
    }
    if (buyRef.current) {
      tl.fromTo(
        buyRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.34, ease: 'back.out(2.2)' },
        0.9,
      )
    }
    tl.fromTo(
      badgesRef.current.filter(Boolean),
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2.4)', stagger: 0.08 },
      1.1,
    )

    // Idle "nhún nhún" — once the click-prompt has settled into place, it
    // keeps gently pulsing forever (a separate looping tween, not part of
    // this finite entrance timeline) to draw the eye toward clicking the
    // box. A scale pulse, not the vertical bob this used to be — paired
    // with `.unboxWrap`'s own `transform-origin` (pinned toward the box's
    // actual direction, different per breakpoint since the two swap
    // relative position on mobile), growing on each pulse reads as
    // reaching/growing toward the box specifically, not just bouncing in
    // place.
    if (unboxRef.current) {
      tl.call(() => {
        idlePulseTweenRef.current = gsap.to(unboxRef.current, {
          scale: 1.12,
          duration: 0.55,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      })
    }
  }

  const handleModelReady = () => {
    onModelReady?.()
    if (autoPlayEntrance) startBoxEntrance()
  }

  return (
    <div className={styles.layer} aria-hidden="true">
      <Ink1 className={`${styles.ink} ${styles.ink1}`} />
      <Ink2 className={`${styles.ink} ${styles.ink2}`} />
      <div className={styles.inkBurstAnchor} ref={burstInkRef}>
        <Ink5 className={styles.inkBurstSvg} />
      </div>
      <Ink5 className={`${styles.ink} ${styles.inkCorner}`} />

      <div className={styles.boxAnchor} ref={boxAnchorRef} onClick={onBoxClick}>
        <div className={styles.boxEntrance} ref={boxEntranceRef}>
          <div className={styles.boxCanvasHost}>
            <Suspense fallback={null}>
              <BoxScene onReady={handleModelReady} playSpin={entranceTriggered} entranceSettled={entranceSettled} />
            </Suspense>
          </div>
        </div>
      </div>

      <div className={styles.burstWrap} ref={burstRef}>
        <Burst className={styles.burstSvg} />
      </div>
      <div className={styles.buyAnchor} ref={buyRef}>
        <BuyOneGetAll className={styles.buyGraphic} />
      </div>

      <div className={styles.unboxAnchor}>
        <div className={styles.unboxWrap} ref={unboxRef}>
          <ClickIcon className={styles.unboxIcon} />
        </div>
      </div>

      <div
        className={`${styles.badge} ${styles.badgeAdvertising}`}
        ref={(el) => {
          badgesRef.current[0] = el
        }}
      >
        <AdvertisingIcon />
      </div>
      <div
        className={`${styles.badge} ${styles.badgeAi}`}
        ref={(el) => {
          badgesRef.current[1] = el
        }}
      >
        <AiGenerativeIcon />
      </div>
      <div
        className={`${styles.badge} ${styles.badgePhotoshoot}`}
        ref={(el) => {
          badgesRef.current[2] = el
        }}
      >
        <PhotoshootIcon />
      </div>
      <div
        className={`${styles.badge} ${styles.badgeMotion}`}
        ref={(el) => {
          badgesRef.current[3] = el
        }}
      >
        <MotionGraphicIcon />
      </div>
    </div>
  )
})

export default HeroDecor
