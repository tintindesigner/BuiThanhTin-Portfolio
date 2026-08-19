import { useLayoutEffect, useRef } from 'react'
import type { Ref } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useCursorTilt } from '../../hooks/useCursorTilt'
import { playSquashBounce, resetSquashBounce } from '../../lib/bounce'
import { categoryId } from '../../lib/categoryId'
import GolinksIcon from '../../assets/svg/golinks-icon.svg?react'
import Ink3 from '../../assets/svg/ink-3.svg?react'
import SeeMoreArt from '../../assets/svg/see-more-hover.svg?react'
import advertisingLetsChill from '../../assets/images/work/advertising-lets-chill.webp'
// These 4 job-card thumbnails ARE their case-study's own key-visual image
// (not a separate export) — reused straight from work-detail/ instead of
// keeping a second identical/near-identical copy just for the grid.
import advertisingStarKombucha from '../../assets/images/work-detail/star-kombucha/kv-chill.webp'
import eventPosmNewLabels from '../../assets/images/work-detail/posm-new-labels/kv-chill.webp'
import eventTradeShowSingapore from '../../assets/images/work/event-trade-show-singapore.webp'
import eventSchoolFest from '../../assets/images/work-detail/school-fest/esf-hero.webp'
import socialPost from '../../assets/images/work/social-post.webp'
import motionCelaTvc from '../../assets/images/work/motion-cela-tvc.webp'
import motionProductVideos from '../../assets/images/work/motion-product-videos.webp'
import motionTarotChill from '../../assets/images/work/motion-tarot-chill.webp'
import productCocktail from '../../assets/images/work/product-cocktail.webp'
import productExportJapan from '../../assets/images/work-detail/sk-japan/product-shoot-1.webp'
import StripedBackground from '../StripedBackground'
import styles from './Work.module.css'

gsap.registerPlugin(ScrollTrigger)

interface Job {
  image: string
  alt: string
  title: string
  caption: string
  href?: string
  /** Centers a decorative ink splat on this card's own bottom corner. */
  deco?: boolean
}

interface Category {
  label: string
  jobs: Job[]
  wide?: boolean
}

const CATEGORIES: Category[] = [
  {
    label: 'ADVERTISING',
    jobs: [
      {
        image: advertisingLetsChill,
        alt: 'Key visual artwork for the CHILL "Let\'s Chill" campaign',
        title: "CHILL | Let's Chill",
        caption: 'Key Visual CHILL design & shooting',
        href: '/work/lets-chill',
      },
      {
        image: advertisingStarKombucha,
        alt: 'AI-generated key visual for Star Kombucha',
        title: 'AI KV STAR KOMBUCHA',
        caption: 'Key visual SK AI Generated & DI',
        href: '/work/star-kombucha',
      },
    ],
  },
  {
    label: 'EVENT & POSM',
    jobs: [
      {
        image: eventPosmNewLabels,
        alt: 'POSM suite for a new product label launch',
        title: 'POSM NEW LABELS',
        caption: 'POSM suite for a high-impact new label launch.',
        href: '/work/posm-new-labels',
      },
      {
        image: eventTradeShowSingapore,
        alt: 'POSM displays for a Singapore trade show booth',
        title: 'Trade Show SINGAPORE',
        caption: 'POSM displays for a trade show in Singapore',
        href: '/work/cela-trade-show-singapore',
      },
      {
        image: eventSchoolFest,
        alt: 'Event visual assets for the CHILL School Fest',
        title: 'School Fest Event',
        caption: 'Designed event visual assets for CHILL School Fest.',
        href: '/work/school-fest-event',
      },
    ],
  },
  {
    label: 'SOCIAL POST',
    wide: true,
    jobs: [
      {
        image: socialPost,
        alt: 'Social media post artwork for CHILL',
        title: 'Social Post',
        caption: 'Designed dynamic social media content to boost audience engagement and brand presence',
        deco: true,
        href: '/work/social-post',
      },
    ],
  },
  {
    label: 'MOTION GRAPHIC & CLIP',
    jobs: [
      {
        image: motionCelaTvc,
        alt: 'AI-generated TVC video for Cela',
        title: 'Cela | AI TVC 15s',
        caption: 'AI Generated video',
        href: 'https://youtu.be/96sx1oqGCBY?si=mtua250yUwkFiRDs',
      },
      {
        image: motionProductVideos,
        alt: 'Product-focused video for CHILL Cocktail',
        title: 'Product-focused videos',
        caption: 'Shooting video Product-focused videos CHILL Cocktail',
        href: 'https://youtu.be/SUfVHmiiBMI?si=W9sP2PCb_gM3irLZ',
      },
      {
        image: motionTarotChill,
        alt: 'Motion graphic video for CHILL Tarot',
        title: 'CHILL | Tarot CHILL',
        caption: 'Design & motion graphic video',
        href: 'https://youtu.be/E3fYxJwnYdY?si=loyeMd5gAdmCrzBC',
      },
    ],
  },
]

const PRODUCT_SHOOTING: Category = {
  label: 'PRODUCT SHOOTING',
  jobs: [
    {
      image: productCocktail,
      alt: 'Product shot of a CHILL cocktail bottle',
      title: 'CHILL Cocktail Product',
      caption: 'Shooting & DI product CHILL Cocktail',
      href: '/work/chill-product-photoshoot',
    },
    {
      image: productExportJapan,
      alt: 'Product shot of Star Kombucha for the Japan export market',
      title: 'SK | Product Export Japan',
      caption: 'Shooting & DI: STAR KOMBUCHA export Japan',
      href: '/work/sk-product-export-japan',
    },
  ],
}

const SEE_MORE_URL = 'https://youtube.com/playlist?list=PLI5QXo3TKM7U&si=bcSQpZg4isV1FsnJ'

// Must match `.readyBand`/`.workBand`'s rotation in Work.module.css.
const PEAK_RIGHT_ANGLE = 4
const PEAK_LEFT_ANGLE = -8

/**
 * Pink overlay on top of the section's purple base, shaped as a peak
 * that points up into the purple at the ribbon's crossing point (see
 * `.pinkPeak` in Work.module.css). Each edge is one oversized rectangle
 * pivoted at the apex and rotated by the same exact degree as its
 * matching ribbon band (`.readyBand`/`.workBand`) — a rotated rect
 * keeps a true angle regardless of the container's aspect ratio, unlike
 * a path baked into a non-uniformly stretched SVG viewBox.
 *
 * `StripedBackground`'s own pattern rotation happens inside its SVG
 * (`patternTransform`), so it composes additively with the parent
 * rect's CSS `rotate()`: net angle = `-angle prop + parent rotation`.
 * Passing 24/12 instead of the shared 20 cancels that out so the
 * stripes still read at the canonical angle everywhere on the site.
 */
function PinkPeak() {
  return (
    <div className={styles.pinkPeak} aria-hidden="true">
      <span className={styles.peakRight}>
        <StripedBackground bg="var(--ink-pink)" stripe="var(--stripe-pink)" angle={20 + PEAK_RIGHT_ANGLE} stripeWidth={60} gap={60} speed={20} style={{ position: 'absolute', inset: 0 }} />
      </span>
      <span className={styles.peakLeft}>
        <StripedBackground bg="var(--ink-pink)" stripe="var(--stripe-pink)" angle={20 + PEAK_LEFT_ANGLE} stripeWidth={60} gap={60} speed={20} style={{ position: 'absolute', inset: 0 }} />
      </span>
    </div>
  )
}

// The hover bounce (card lift + backing sticker reveal) used to be two
// separately GSAP-animated elements (`.card` and a sibling `.cardBacking`)
// kept in sync by hand via mouseenter/mouseleave. That pairing kept
// desyncing in real use — scrolling with the cursor resting over a card
// doesn't reliably fire a matching enter/leave pair in every case, so the
// backing could get left stuck mid-reveal (confirmed live: `:hover` would
// read `false` while the backing was still visually at its hovered scale).
// Fixed at the root by driving BOTH from a single shared trigger instead:
// `.cardBacking` stays a SIBLING of `.card` (declared first, so it still
// paints entirely below `.card`'s own opaque background — a CHILD can
// never hide behind its own parent's background, only behind other child
// content, which was tried first and didn't fully cover the card), but
// both it and `.card`'s own lift/rotate are now pure CSS
// `:hover`/`:focus-within` rules keyed off their common `.cardWrap`
// ancestor — no JS state to fall out of sync with, since the browser's
// own `:hover` match is always correct regardless of how scroll/pointer
// events fire.
function JobCard({ image, alt, title, caption, href, wide, deco }: Job & { wide?: boolean }) {
  const content = (
    <>
      <div className={styles.cardImageFrame}>
        <img className={styles.cardImage} src={image} alt={alt} loading="lazy" />
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardText}>
          <p className={styles.cardTitle}>{title}</p>
          <p className={styles.cardCaption}>{caption}</p>
        </div>
        <GolinksIcon className={styles.cardIcon} aria-hidden="true" />
      </div>
    </>
  )
  const isInternal = href?.startsWith('/')
  const cardEl = isInternal ? (
    <Link className={styles.card} to={href!}>
      {content}
    </Link>
  ) : href ? (
    <a className={styles.card} href={href} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <div className={styles.card}>{content}</div>
  )

  return (
    <div className={`${styles.cardWrap} ${wide ? styles.cardWrapWide : ''}`}>
      {deco && <Ink3 className={styles.cardInk} aria-hidden="true" />}
      <span className={styles.cardBacking} aria-hidden="true" />
      {cardEl}
    </div>
  )
}

/**
 * Infinite horizontal marquee. The track's content is rendered twice
 * back-to-back so animating the track exactly `-50%` on an infinite
 * repeat never shows a seam. The ref goes on this double-width track,
 * not its `overflow: hidden` wrapper.
 */
function MarqueeTrack({ text, trackRef }: { text: string; trackRef: Ref<HTMLDivElement> }) {
  return (
    <div className={styles.track} ref={trackRef}>
      <span className={styles.trackHalf}>{text}</span>
      <span className={styles.trackHalf} aria-hidden="true">
        {text}
      </span>
    </div>
  )
}

// Each `trackHalf` copy must be at least as wide as the band's own
// container (180% of the section) for the marquee loop to stay
// seamless; the repeat counts are sized with a comfortable margin above
// that for any realistic viewport/font size.
const READY_TEXT = Array(30).fill('ARE YOU READY?').join(' — ') + ' — '
const WORK_TEXT = Array(40).fill('WORK').join(' — ') + ' — '

export default function Work() {
  const readyTrackRef = useRef<HTMLDivElement>(null)
  const workTrackRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const seeMoreTilt = useCursorTilt()
  const seeMoreRef = useRef<HTMLElement | null>(null)
  const setSeeMoreRef = (el: HTMLAnchorElement | null) => {
    seeMoreRef.current = el
  }
  const onSeeMoreEnter = () => playSquashBounce(seeMoreRef.current, null)
  const onSeeMoreLeave: typeof seeMoreTilt.onMouseLeave = (e) => {
    seeMoreTilt.onMouseLeave(e)
    resetSquashBounce(seeMoreRef.current, null)
  }

  useLayoutEffect(() => {
    if (reduceMotion) return
    const tweens = [
      gsap.to(readyTrackRef.current, { xPercent: -50, duration: 44, ease: 'none', repeat: -1 }),
      gsap.to(workTrackRef.current, { xPercent: -50, duration: 52, ease: 'none', repeat: -1 }),
    ]
    return () => tweens.forEach((t) => t.kill())
  }, [reduceMotion])

  const gridRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const cards = gridRef.current?.querySelectorAll(`.${styles.card}`) ?? []
    gsap.set(cards, { opacity: 0, y: 40 })
    const tl = gsap.timeline({ scrollTrigger: { trigger: gridRef.current, start: 'top 80%', once: true } })
    // `clearProps: 'all'` strips the inline styles GSAP writes (opacity,
    // transform, and the standalone translate/rotate/scale properties)
    // the instant each card's own entrance tween finishes — otherwise
    // that inline `transform` sits on the element permanently and, being
    // higher specificity than any stylesheet rule, silently blocks the
    // CSS `:hover` bounce transform in Work.module.css from ever
    // visually applying.
    tl.to(cards, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)', stagger: 0.06, clearProps: 'all' })
    return () => {
      tl.scrollTrigger?.kill()
      tl.kill()
    }
  }, [])

  return (
    <section id="work" className={styles.work}>
      {/* Bleeds 4px above the section's true top edge to cover a
          subpixel-rounding hairline at the About/Work seam. */}
      <StripedBackground
        bg="var(--ink-purple)"
        stripe="var(--stripe-purple)"
        angle={20}
        stripeWidth={60}
        gap={60}
        speed={20}
        style={{ position: 'absolute', top: '-4px', left: 0, right: 0, bottom: 0 }}
      />

      {/* Spans the whole section, not just `.ribbon`'s own box, so it
          reaches the section's true bottom regardless of grid height. */}
      <PinkPeak />

      <div className={styles.ribbon} aria-hidden="true">
        <div className={styles.readyBand}>
          <MarqueeTrack text={READY_TEXT} trackRef={readyTrackRef} />
        </div>
        <div className={styles.workBand}>
          <MarqueeTrack text={WORK_TEXT} trackRef={workTrackRef} />
        </div>
      </div>

      <div className={styles.grid} ref={gridRef}>
        {CATEGORIES.map((cat) => (
          <div className={styles.category} id={categoryId(cat.label)} key={cat.label}>
            <h3 className={styles.categoryTitle}>{cat.label}</h3>
            <div className={styles.cardRow}>
              {cat.jobs.map((job) => (
                <JobCard key={job.title} {...job} wide={cat.wide} />
              ))}
            </div>
          </div>
        ))}

        {/* `.seeMoreArt` owns its own cursor-tilt transform (CSS custom
            properties from `useCursorTilt`), so the GSAP bounce is
            applied to the outer `.seeMore` link instead — GSAP and a
            CSS-driven transform on the same element would fight. */}
        <a
          ref={setSeeMoreRef}
          className={styles.seeMore}
          href={SEE_MORE_URL}
          target="_blank"
          rel="noreferrer"
          onMouseMove={seeMoreTilt.onMouseMove}
          onMouseEnter={onSeeMoreEnter}
          onMouseLeave={onSeeMoreLeave}
        >
          <SeeMoreArt className={styles.seeMoreArt} />
        </a>

        <div className={styles.category} id={categoryId(PRODUCT_SHOOTING.label)}>
          <h3 className={styles.categoryTitle}>{PRODUCT_SHOOTING.label}</h3>
          <div className={styles.cardRow}>
            {PRODUCT_SHOOTING.jobs.map((job) => (
              <JobCard key={job.title} {...job} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
