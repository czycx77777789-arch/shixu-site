import { useEffect, useRef, useState } from 'react'
import { SITE_CONFIG } from './content'

const INTRO_PHASES = {
  BOOT: 'boot',
  INTRO: 'intro',
  REVEALING: 'revealing',
  MAIN: 'main',
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(mediaQuery.matches)

    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)

    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  return reducedMotion
}

function fallbackCopyText(text) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function SectionHeading({ label, title, body }) {
  return (
    <header className="section-heading">
      <p className="section-heading__label">{label}</p>
      <h2 className="section-heading__title">{title}</h2>
      {body ? <p className="section-heading__body">{body}</p> : null}
    </header>
  )
}

function Reveal({ as: Tag = 'div', className = '', delay = 0, children, ...props }) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current

    if (!node) {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.16,
        rootMargin: '0px 0px -10% 0px',
      },
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`reveal ${isVisible ? 'is-visible' : ''} ${className}`.trim()}
      style={{ '--reveal-delay': `${delay}ms` }}
      {...props}
    >
      {children}
    </Tag>
  )
}

function IntroOverlay({ phase, onStart }) {
  if (phase === INTRO_PHASES.BOOT || phase === INTRO_PHASES.MAIN) {
    return null
  }

  const overlayClass = [
    'intro-overlay',
    phase === INTRO_PHASES.INTRO ? 'intro-overlay--idle' : '',
    phase === INTRO_PHASES.REVEALING ? 'intro-overlay--revealing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={overlayClass}>
      {phase === INTRO_PHASES.INTRO ? (
        <button className="intro-overlay__prompt" onClick={onStart} type="button">
          点击开灯
        </button>
      ) : (
        <div className="intro-overlay__glow" aria-hidden="true" />
      )}
    </div>
  )
}

export default function App() {
  const reducedMotion = usePrefersReducedMotion()
  const [phase, setPhase] = useState(INTRO_PHASES.BOOT)
  const [toast, setToast] = useState('')

  useEffect(() => {
    let hasSeenIntro = false

    try {
      hasSeenIntro = window.localStorage.getItem(SITE_CONFIG.introSeenStorageKey) === '1'
    } catch {
      hasSeenIntro = false
    }

    setPhase(hasSeenIntro ? INTRO_PHASES.MAIN : INTRO_PHASES.INTRO)
  }, [])

  useEffect(() => {
    if (phase !== INTRO_PHASES.REVEALING) {
      return undefined
    }

    const duration = reducedMotion ? 180 : 1900

    const timer = window.setTimeout(() => setPhase(INTRO_PHASES.MAIN), duration)

    return () => window.clearTimeout(timer)
  }, [phase, reducedMotion])

  useEffect(() => {
    const locked = phase !== INTRO_PHASES.MAIN
    document.documentElement.style.overflow = locked ? 'hidden' : ''
    document.body.style.overflow = locked ? 'hidden' : ''

    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [phase])

  useEffect(() => {
    if (!toast) {
      return undefined
    }

    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const startIntro = () => {
    try {
      window.localStorage.setItem(SITE_CONFIG.introSeenStorageKey, '1')
    } catch {
      // Ignore local storage failures and continue.
    }

    if (reducedMotion) {
      setPhase(INTRO_PHASES.MAIN)
      return
    }

    setPhase(INTRO_PHASES.REVEALING)
  }

  const replayIntro = () => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    setPhase(INTRO_PHASES.INTRO)
  }

  const handleCopyWechat = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(SITE_CONFIG.wechatId)
      } else {
        fallbackCopyText(SITE_CONFIG.wechatId)
      }

      setToast('微信号已复制')
    } catch {
      setToast(`微信号：${SITE_CONFIG.wechatId}`)
    }
  }

  const heroReady = phase === INTRO_PHASES.REVEALING || phase === INTRO_PHASES.MAIN

  return (
    <div className={`app phase-${phase}`}>
      <IntroOverlay phase={phase} onStart={startIntro} />

      {phase === INTRO_PHASES.MAIN ? (
        <button className="replay-control is-visible" onClick={replayIntro} type="button">
          重新开灯
        </button>
      ) : null}

      <main
        aria-hidden={phase !== INTRO_PHASES.MAIN}
        className="site-shell"
        data-hero-ready={heroReady}
      >
        <section className="hero">
          <div className="hero__media" />
          <div className="hero__topbar">
            <span className="hero__brand">{SITE_CONFIG.productName}</span>
          </div>

          <div className="hero__content">
            <div className="hero__panel">
              <p className="hero__eyebrow">{SITE_CONFIG.hero.eyebrow}</p>
              <h1 className="hero__title">
                {SITE_CONFIG.hero.title.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h1>
              <p className="hero__description">{SITE_CONFIG.hero.description}</p>

              <div className="hero__tags">
                {SITE_CONFIG.hero.tags.map((tag) => (
                  <span key={tag} className="hero__tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <p className="hero__scroll-hint">继续下滑</p>
          </div>
        </section>

        <div className="content-stack">
          <Reveal as="section" className="content-card content-card--story">
            <SectionHeading
              label={SITE_CONFIG.story.label}
              title={SITE_CONFIG.story.title}
            />

            <div className="story-copy">
              {SITE_CONFIG.story.paragraphs.map((paragraph, index) => (
                <Reveal as="p" className="story-copy__paragraph" delay={index * 90} key={paragraph}>
                  {paragraph}
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Reveal as="section" className="content-card">
            <SectionHeading
              label={SITE_CONFIG.advantages.label}
              title={SITE_CONFIG.advantages.title}
            />

            <div className="advantage-grid">
              {SITE_CONFIG.advantages.items.map((item, index) => (
                <article
                  className="advantage-card"
                  key={item.title}
                  style={{ '--item-delay': `${index * 90}ms` }}
                >
                  <h3 className="advantage-card__title">{item.title}</h3>
                  <p className="advantage-card__body">{item.body}</p>
                </article>
              ))}
            </div>
          </Reveal>

          <Reveal as="section" className="content-card content-card--goal">
            <SectionHeading
              label={SITE_CONFIG.target.label}
              title={SITE_CONFIG.target.title}
              body={SITE_CONFIG.target.body}
            />

            <div className="goal-pills">
              {SITE_CONFIG.target.pillars.map((pillar, index) => (
                <span
                  className="goal-pill"
                  key={pillar}
                  style={{ '--item-delay': `${index * 80}ms` }}
                >
                  {pillar}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal as="section" className="content-card">
            <SectionHeading
              label={SITE_CONFIG.scenes.label}
              title={SITE_CONFIG.scenes.title}
            />

            <div className="scene-grid">
              {SITE_CONFIG.scenes.items.map((item, index) => (
                <article
                  className="scene-card"
                  key={item.id}
                  style={{ '--item-delay': `${index * 80}ms` }}
                >
                  <p className="scene-card__index">{item.id}</p>
                  <h3 className="scene-card__title">{item.title}</h3>
                  <p className="scene-card__body">{item.body}</p>
                </article>
              ))}
            </div>
          </Reveal>

          <Reveal as="section" className="content-card content-card--cta">
            <SectionHeading
              label={SITE_CONFIG.cta.label}
              title={SITE_CONFIG.cta.title}
              body={SITE_CONFIG.cta.body}
            />

            <button className="cta-button" onClick={handleCopyWechat} type="button">
              {SITE_CONFIG.cta.button}
            </button>
            <p className="cta-note">{SITE_CONFIG.cta.note}</p>
          </Reveal>
        </div>
      </main>

      <div className={`toast ${toast ? 'is-visible' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  )
}
