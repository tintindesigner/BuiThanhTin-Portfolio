import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import HeroDecor from './HeroDecor'
import type { HeroDecorHandle } from './HeroDecor'
import LiquidTransition from './LiquidTransition'
import type { LiquidTransitionHandle } from './LiquidTransition'
import StripedBackground from '../StripedBackground'
import styles from './Hero.module.css'

gsap.registerPlugin(ScrollTrigger)

interface HeroProps {
  /** Fires once the ENTIRE liquid transition has finished — rise, cover,
   *  AND fade-out all done, nothing left on screen — not merely once
   *  covered. About uses this to start its FIGURE X1 entrance only after
   *  the transition has genuinely ended, per explicit spec ("khi kết
   *  thúc chuyển cảnh thì character... mới bắt đầu chuyển động"). */
  onCoverComplete?: () => void
  /** Skip the scroll-triggered liquid transition entirely and reveal
   *  About's FIGURE X1 immediately instead. Used when this mount is
   *  arriving via a cross-page nav that's about to programmatically
   *  scroll straight to a section further down (Work/Contact/About) —
   *  letting the ScrollTrigger fire partway through that scroll would
   *  hijack it: the transition's own scroll-snap (see `onCovered` below)
   *  jumps to About's top the instant it finishes, cancelling whatever
   *  scroll was already in flight toward the real target. */
  skipIntro?: boolean
  /** Fires once the box model has loaded and camera framing has settled
   *  — used by the site-wide loading screen (shown once per session on
   *  first load) to know Hero's heavy asset is ready, so it can start
   *  fading out. Does NOT itself start the box's bounce-in — see
   *  `autoPlayEntrance`. */
  onModelReady?: () => void
  /** When false, the box's entrance does not auto-start the instant the
   *  model is ready — the parent must call `playEntrance()` via ref once
   *  it's actually safe to (e.g. after a covering loading screen has
   *  fully faded out). Defaults to true. */
  autoPlayEntrance?: boolean
}

export interface HeroHandle {
  /** Manually starts the box's bounce-in entrance. Only needed when
   *  `autoPlayEntrance` is false — idempotent otherwise. */
  playEntrance: () => void
}

const Hero = forwardRef<HeroHandle, HeroProps>(function Hero(
  { onCoverComplete, skipIntro, onModelReady, autoPlayEntrance },
  ref,
) {
  const stageRef = useRef<HTMLDivElement>(null)
  const heroDecorRef = useRef<HeroDecorHandle>(null)
  const liquidRef = useRef<LiquidTransitionHandle>(null)
  const triggeredRef = useRef(false)
  // Read via a ref (updated every render) rather than closing over the
  // prop directly — `playTransition` is only ever created once (read by
  // the mount-only ScrollTrigger effect below) but `onCoverComplete`
  // could in principle change identity across renders, so this avoids an
  // exhaustive-deps warning without re-subscribing ScrollTrigger.
  const onCoverCompleteRef = useRef(onCoverComplete)
  onCoverCompleteRef.current = onCoverComplete

  useImperativeHandle(ref, () => ({
    playEntrance: () => heroDecorRef.current?.playEntrance(),
  }))

  // Hero->About transition — fires from EITHER trigger (scrolling through
  // the sticky buffer below, or clicking the box), plays the exact same
  // sequence, and only ever once (`triggeredRef` guards both entry
  // points). The box does one quick squash-bounce, then the liquid rise
  // covers the screen; the scroll snap happens as soon as it's fully
  // covered (hidden behind the opaque cover — `onCovered`), but About's
  // entrance is only told to start once the WHOLE transition (rise +
  // fade) has finished — the returned promise, not `onCovered`.
  const playTransition = () => {
    if (triggeredRef.current) return
    triggeredRef.current = true
    heroDecorRef.current?.pulseBox()
    liquidRef.current
      ?.play(() => {
        const stage = stageRef.current
        // 'instant', not 'auto' — 'auto' defers to the CSS
        // `scroll-behavior` property, which (if `smooth` anywhere in
        // scope) would animate this over several hundred ms instead of
        // snapping it instantly behind the still-opaque cover, confirmed
        // live (scrollY was landing in gradual steps instead of one jump).
        if (stage) window.scrollTo({ top: stage.offsetTop + stage.offsetHeight, behavior: 'instant' })
      })
      .then(() => onCoverCompleteRef.current?.())
  }

  // Deferred to a plain (not layout) effect, and separate from the
  // ScrollTrigger setup below: `onCoverCompleteRef` calls into About's
  // `playFigureEntrance` via its imperative handle, but About is a JSX
  // SIBLING mounting after Hero, not a child — React commits sibling
  // layout effects in tree order (Hero's before About's), so calling this
  // from Hero's OWN useLayoutEffect fires before About has attached its
  // ref at all (`aboutRef.current` still null), silently no-opping FIGURE
  // X1's reveal. A regular `useEffect` runs after every layout effect in
  // the tree has committed, by which point the ref is attached.
  useEffect(() => {
    if (skipIntro) onCoverCompleteRef.current?.()
  }, [skipIntro])

  useLayoutEffect(() => {
    if (skipIntro) {
      // Only the auto-scroll trigger is skipped here (no ScrollTrigger is
      // created below) — `triggeredRef` must stay false so the box is
      // still clickable afterward. Setting it true here used to
      // permanently disable the click-to-transition path for the rest of
      // this page's life, even though nothing was actually guarding
      // against a duplicate ScrollTrigger fire (none was ever created).
      return
    }
    // `.hero`'s `position:sticky` naturally releases once scrollY passes
    // the buffer height (170vh stage - 100vh sticky child = 70vh — see
    // Hero.module.css), at which point About genuinely scrolls into view
    // for real, not just "about to". `start:'bottom 95%'` fires at
    // scrollY = stageHeight - 0.95*viewportHeight = 0.75*viewportHeight —
    // AFTER that 0.70*viewportHeight release point, so About was already
    // visibly peeking in before the transition even started (confirmed
    // live: worked fine via box-click, which naturally happens earlier,
    // but broke via scroll specifically). `bottom 115%` fires at
    // 0.55*viewportHeight instead — safely before the 0.70 release point,
    // regardless of actual viewport height (the relationship is
    // proportional, not a fixed pixel value).
    const st = ScrollTrigger.create({
      trigger: stageRef.current,
      start: 'bottom 115%',
      once: true,
      onEnter: playTransition,
    })
    return () => st.kill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipIntro])

  return (
    <div className={styles.heroStage} ref={stageRef}>
      <section id="home" className={styles.hero}>
        <StripedBackground
          bg="var(--ink-yellow)"
          stripe="var(--stripe-yellow)"
          angle={20}
          stripeWidth={60}
          gap={60}
          style={{ position: 'absolute', inset: 0 }}
        />
        <HeroDecor
          ref={heroDecorRef}
          onBoxClick={playTransition}
          onModelReady={onModelReady}
          autoPlayEntrance={autoPlayEntrance}
        />
      </section>
      <LiquidTransition ref={liquidRef} />
    </div>
  )
})

export default Hero
