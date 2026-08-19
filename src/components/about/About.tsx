import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { playSquashBounce, resetSquashBounce } from '../../lib/bounce'
import { categoryId, CATEGORY_LABELS } from '../../lib/categoryId'
import AdvertisingIcon from '../../assets/svg/advertising-icon.svg?react'
import AiGenerativeIcon from '../../assets/svg/ai-generative-icon.svg?react'
import MotionGraphicIcon from '../../assets/svg/motion-graphic-icon.svg?react'
import PhotoshootIcon from '../../assets/svg/photoshoot-icon.svg?react'
import Ink2 from '../../assets/svg/ink-2.svg?react'
import Ink3 from '../../assets/svg/ink-3.svg?react'
import WordmarkTop from '../../assets/svg/about-tintin-wordmark-top.svg?react'
import WordmarkBottom from '../../assets/svg/about-tintin-wordmark-bottom.svg?react'
import BattleTimeline from '../../assets/svg/about-battle-timeline.svg?react'
import riderPhoto from '../../assets/images/about-tintin-rider.webp'
import urCardArt from '../../assets/images/about-ur-card.webp'
import urCardBack from '../../assets/images/about-ur-card-back.webp'
import StripedBackground from '../StripedBackground'
import styles from './About.module.css'

gsap.registerPlugin(ScrollTrigger)

const BATTLE_HISTORY = [
  { years: '2018-2019', role: 'Junior Graphic Designer', company: 'Cty TNHH MTV XNK Thái Việt' },
  { years: '2019-2020', role: 'Graphic Designer', company: 'Cty CP TP Hoding' },
  { years: '2020-2026', role: 'Senior Graphic Designer & Motion Designer', company: 'Cty CP Goody Group' },
]

// Index order matches JSX below (Advertising, AI, Motion, Photoshoot).
// Left-column badges (0, 2) fly in from off-screen left; right-column
// badges (1, 3) from off-screen right — "gom vào" from outside the frame.
const BADGE_FROM_LEFT = [true, false, true, false]

// Each badge scrolls to its matching category in Work on click. AI
// Generative points at the same "ADVERTISING" category as the first
// badge — Work has no separate AI category of its own; that job (AI KV
// Star Kombucha) is filed under Advertising there.
const BADGE_CATEGORY = [
  CATEGORY_LABELS.advertising,
  CATEGORY_LABELS.advertising,
  CATEGORY_LABELS.motionGraphic,
  CATEGORY_LABELS.productShooting,
]

export interface AboutHandle {
  /** Plays the FIGURE X1 entrance immediately, if it hasn't already. Called
   *  by Hero once its liquid transition has entirely finished, so the
   *  character/icons/badges only ever start moving after the transition
   *  genuinely ends — see the effect below for why there's no
   *  ScrollTrigger-based fallback for this one specifically. */
  playFigureEntrance: () => void
}

const About = forwardRef<AboutHandle>(function About(_props, ref) {
  const figureRef = useRef<HTMLDivElement>(null)
  const riderRef = useRef<HTMLDivElement>(null)
  const wordmarkRef = useRef<HTMLDivElement>(null)
  const badgeIconRefs = useRef<(HTMLDivElement | null)[]>([])
  const badgeLabelRefs = useRef<(HTMLParagraphElement | null)[]>([])
  const badgeRefs = useRef<(HTMLButtonElement | null)[]>([])

  const goToWorkCategory = (label: string) => {
    document.getElementById(categoryId(label))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const urCardRef = useRef<HTMLDivElement>(null)
  const urCardAnchorRef = useRef<HTMLDivElement>(null)
  const urCardStatsRef = useRef<HTMLDivElement>(null)
  const battleRef = useRef<HTMLDivElement>(null)
  const lightningRef = useRef<HTMLDivElement>(null)
  const timelineListRef = useRef<HTMLDivElement>(null)
  const [cardFlipped, setCardFlipped] = useState(false)
  const figurePlayedRef = useRef(false)
  const playFigureRef = useRef<() => void>(() => {})

  useImperativeHandle(ref, () => ({
    playFigureEntrance: () => playFigureRef.current(),
  }))

  // FIGURE X1 entrance: character slides in from the left, the TINTIN
  // wordmark fades in behind it, the 4 skill badges converge in from
  // outside the viewport (left column from the left, right column from
  // the right), and each label does a quick elastic "nhún" pop once its
  // icon lands. Fired EXCLUSIVELY via the `playFigureEntrance` handle
  // above, called by Hero only once its liquid transition has ENTIRELY
  // finished (rise + fade both done) — deliberately no ScrollTrigger
  // fallback here. An earlier version had one "for direct #about link
  // jumps", but that fallback fires the instant Hero's own scroll-snap
  // lands (scrollY jumping figureRef past its 75% threshold immediately
  // after the cover completes) — racing ahead of and defeating the
  // "wait for the transition to fully end" requirement, confirmed via a
  // live timed trace (character opacity was already climbing the moment
  // the liquid started fading, not after it finished). `figurePlayedRef`
  // still guards against the handle being called twice.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(riderRef.current, { x: -400, opacity: 0 })
      gsap.set(wordmarkRef.current, { opacity: 0 })
      badgeIconRefs.current.forEach((el, i) => {
        if (!el) return
        gsap.set(el, { x: BADGE_FROM_LEFT[i] ? -320 : 320, opacity: 0 })
      })
      gsap.set(badgeLabelRefs.current.filter(Boolean), { scale: 0, opacity: 0 })

      const play = () => {
        if (figurePlayedRef.current) return
        figurePlayedRef.current = true
        const tl = gsap.timeline()
        tl.to(riderRef.current, { x: 0, opacity: 1, duration: 0.7, ease: 'power2.out' })
        tl.to(wordmarkRef.current, { opacity: 1, duration: 0.5, ease: 'power1.out' }, '<0.1')
        tl.to(
          badgeIconRefs.current.filter(Boolean),
          { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out', stagger: 0.1 },
          '<0.2',
        )
        tl.to(
          badgeLabelRefs.current.filter(Boolean),
          { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.4)', stagger: 0.1 },
          '<0.15',
        )
      }
      playFigureRef.current = play
    }, figureRef)
    return () => ctx.revert()
  }, [])

  // UR CARD scroll-reveal: the card rotates in (extra tilt + scale +
  // opacity settling to rest), and each stat line pops up from below with
  // a short elastic "nhún", staggered per row — like end-credits text.
  // Queries `<p>` children directly instead of per-row refs since the
  // stat list is fixed markup, not a mapped array.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(urCardAnchorRef.current, { opacity: 0, scale: 0.8, rotate: -25 })
      const rows = urCardStatsRef.current?.querySelectorAll('p') ?? []
      gsap.set(rows, { y: 24, opacity: 0 })

      const tl = gsap.timeline({
        scrollTrigger: { trigger: urCardRef.current, start: 'top 70%', once: true },
      })
      tl.to(urCardAnchorRef.current, { opacity: 1, scale: 1, rotate: 0, duration: 0.7, ease: 'back.out(1.7)' })
      tl.to(rows, { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(2.2)', stagger: 0.12 }, '<0.15')
    }, urCardRef)
    return () => ctx.revert()
  }, [])

  // BATTLE HISTORY: the lightning bolt "draws" top-to-bottom (a clip-path
  // wipe, not stroke-dasharray — the source SVG is a single FILLED shape
  // with no stroke, so there's no path outline to dash-animate), then
  // each row's year (left) and role/company (right) converge in from
  // their own side with a "nhún" bounce, staggered down the list.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(lightningRef.current, { clipPath: 'inset(0 0 100% 0)' })
      const years = timelineListRef.current?.querySelectorAll(`.${styles.timelineYear}`) ?? []
      const details = timelineListRef.current?.querySelectorAll(`.${styles.timelineDetails}`) ?? []
      gsap.set(years, { x: -50, opacity: 0 })
      gsap.set(details, { x: 50, opacity: 0 })

      const tl = gsap.timeline({
        scrollTrigger: { trigger: battleRef.current, start: 'top 70%', once: true },
      })
      tl.to(lightningRef.current, { clipPath: 'inset(0 0 0% 0)', duration: 0.9, ease: 'power2.inOut' })
      tl.to(years, { x: 0, opacity: 1, duration: 0.45, ease: 'back.out(2.2)', stagger: 0.15 }, '<0.3')
      tl.to(details, { x: 0, opacity: 1, duration: 0.45, ease: 'back.out(2.2)', stagger: 0.15 }, '<')
    }, battleRef)
    return () => ctx.revert()
  }, [])

  return (
    <section id="about" className={styles.about}>
      <StripedBackground
        bg="var(--ink-purple)"
        stripe="var(--stripe-purple)"
        angle={20}
        stripeWidth={60}
        gap={60}
        speed={20}
        style={{ position: 'absolute', inset: 0 }}
      />
      <div className={styles.figure} ref={figureRef}>
        <h2 className={styles.sectionTitle}>FIGURE X1</h2>

        <div className={styles.wordmarkWrap} ref={wordmarkRef} aria-hidden="true">
          <WordmarkTop className={styles.wordmarkTop} />
          <WordmarkBottom className={styles.wordmarkBottom} />
        </div>
        <div className={styles.riderPhotoAnchor} ref={riderRef}>
          <img className={styles.riderPhoto} src={riderPhoto} alt="Illustrated portrait of Tin Tin riding a scooter" />
        </div>

        <button
          type="button"
          className={`${styles.badge} ${styles.badgeAdvertising}`}
          ref={(el) => { badgeRefs.current[0] = el }}
          onMouseEnter={() => playSquashBounce(badgeRefs.current[0])}
          onMouseLeave={() => resetSquashBounce(badgeRefs.current[0])}
          onClick={() => goToWorkCategory(BADGE_CATEGORY[0])}
        >
          <div className={styles.badgeIcon} ref={(el) => { badgeIconRefs.current[0] = el }}>
            <AdvertisingIcon />
          </div>
          <p className={styles.badgeLabel} ref={(el) => { badgeLabelRefs.current[0] = el }}>
            ADVERTISING
          </p>
        </button>
        <button
          type="button"
          className={`${styles.badge} ${styles.badgeAi}`}
          ref={(el) => { badgeRefs.current[1] = el }}
          onMouseEnter={() => playSquashBounce(badgeRefs.current[1])}
          onMouseLeave={() => resetSquashBounce(badgeRefs.current[1])}
          onClick={() => goToWorkCategory(BADGE_CATEGORY[1])}
        >
          <div className={styles.badgeIcon} ref={(el) => { badgeIconRefs.current[1] = el }}>
            <AiGenerativeIcon />
          </div>
          <p className={styles.badgeLabel} ref={(el) => { badgeLabelRefs.current[1] = el }}>
            AI GENERATIVE
          </p>
        </button>
        <button
          type="button"
          className={`${styles.badge} ${styles.badgeMotion}`}
          ref={(el) => { badgeRefs.current[2] = el }}
          onMouseEnter={() => playSquashBounce(badgeRefs.current[2])}
          onMouseLeave={() => resetSquashBounce(badgeRefs.current[2])}
          onClick={() => goToWorkCategory(BADGE_CATEGORY[2])}
        >
          <div className={styles.badgeIcon} ref={(el) => { badgeIconRefs.current[2] = el }}>
            <MotionGraphicIcon />
          </div>
          <p className={styles.badgeLabel} ref={(el) => { badgeLabelRefs.current[2] = el }}>
            MOTION GRAPHIC
            <br />& CLIP
          </p>
        </button>
        <button
          type="button"
          className={`${styles.badge} ${styles.badgePhotoshoot}`}
          ref={(el) => { badgeRefs.current[3] = el }}
          onMouseEnter={() => playSquashBounce(badgeRefs.current[3])}
          onMouseLeave={() => resetSquashBounce(badgeRefs.current[3])}
          onClick={() => goToWorkCategory(BADGE_CATEGORY[3])}
        >
          <div className={styles.badgeIcon} ref={(el) => { badgeIconRefs.current[3] = el }}>
            <PhotoshootIcon />
          </div>
          <p className={styles.badgeLabel} ref={(el) => { badgeLabelRefs.current[3] = el }}>
            PRODUCT
            <br />
            PHOTOSHOOT
          </p>
        </button>
      </div>

      <div className={styles.urCard} ref={urCardRef}>
        {/* Ink declared BEFORE the title so it paints behind it (both are
            position:absolute with no z-index — plain DOM order decides
            stacking) — same "ink first, everything else after" ordering
            Hero uses for its own decorative splats. */}
        <Ink3 className={styles.urCardInk} aria-hidden="true" />
        <h2 className={styles.sectionTitle}>UR CARD X1</h2>
        <div className={styles.urCardRow}>
          <div className={styles.urCardAnchor} ref={urCardAnchorRef}>
            <div
              className={styles.urCardFlipWrap}
              onClick={() => setCardFlipped((v) => !v)}
              role="button"
              tabIndex={0}
              aria-label="Flip the trading card"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setCardFlipped((v) => !v)
              }}
            >
              <div className={styles.urCardInner} data-flipped={cardFlipped}>
                <img
                  className={`${styles.urCardFace} ${styles.urCardFront}`}
                  src={urCardArt}
                  alt="Trading card portrait of Bui Thanh Tin"
                />
                <img
                  className={`${styles.urCardFace} ${styles.urCardBack}`}
                  src={urCardBack}
                  alt="Trading card back — Tin Tin riding a scooter"
                />
              </div>
              <span className={styles.urCardGlare} aria-hidden="true" />
            </div>
          </div>
          <div className={styles.urCardStats} ref={urCardStatsRef}>
            <p>Battery / Energy: 9999</p>
            <p>Class: Creative Designer/Creative Team Player</p>
            <p className={styles.urCardAbilityLabel}>Special Abilities:</p>
            <p className={styles.urCardAbilities}>Fast Brief Comprehension (+99)</p>
            <p className={styles.urCardAbilities}>Workflow Mastery (+95)</p>
            <p className={styles.urCardAbilities}>Team Synergy (+100)</p>
            <p className={styles.urCardAbilities}>
              Compatibility: Seamlessly integrates with Planners, Accounts, and Copywriters.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.battleHistory} ref={battleRef}>
        <Ink2 className={styles.battleHistoryInk} aria-hidden="true" />
        <h2 className={styles.sectionTitle}>BATTLE HISTORY</h2>
        <div className={styles.timelineTrack} ref={lightningRef} aria-hidden="true">
          <BattleTimeline />
        </div>
        <div className={styles.timelineList} ref={timelineListRef}>
          {BATTLE_HISTORY.map((entry) => (
            <div className={styles.timelineRow} key={entry.years}>
              <p className={styles.timelineYear}>{entry.years}</p>
              <div className={styles.timelineDetails}>
                <p className={styles.timelineRole}>{entry.role}</p>
                <p className={styles.timelineCompany}>- {entry.company}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
})

export default About
