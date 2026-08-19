import Ink5 from '../../assets/svg/ink-5.svg?react'
import StripedBackground from '../StripedBackground'
import styles from './Contact.module.css'

export default function Contact() {
  return (
    <section id="contact" className={styles.contact}>
      <StripedBackground
        bg="var(--ink-purple)"
        stripe="var(--stripe-purple)"
        angle={20}
        stripeWidth={60}
        gap={60}
        speed={20}
        style={{ position: 'absolute', inset: 0 }}
      />
      <div className={styles.inner}>
        <div className={styles.titleWrap}>
          <Ink5 className={styles.ink} aria-hidden="true" />
          <h2 className={styles.sectionTitle}>CONTACT</h2>
        </div>
        <div className={styles.details}>
          <a className={styles.detail} href="mailto:thanntinbui@gmail.com">
            Email:
            <br />
            thanntinbui@gmail.com
          </a>
          <a className={`${styles.detail} ${styles.detailRight}`} href="tel:+84395927162">
            Phone:
            <br />
            039.592.7162
          </a>
        </div>
      </div>
    </section>
  )
}
