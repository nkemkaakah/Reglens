import { Fragment, useEffect, useRef } from 'react'
import {
  AlertTriangle,
  Brain,
  CheckSquare,
  ChevronDown,
  FileWarning,
  GitBranch,
  Link2,
  Mail,
  Play,
  Scan,
  ShieldOff,
  Upload,
} from 'lucide-react'

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function LinkedinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

type IconComponent = React.ComponentType<{ size?: number }>

// ── Palette ──────────────────────────────────────────────────────────────────
// Warm off-white light mode. Deep navy text. Teal accent.
const T = '#0d9488'          // teal
const T_BG = 'rgba(13,148,136,0.08)'

const PROBLEMS: { Icon: IconComponent; title: string; body: string }[] = [
  {
    Icon: FileWarning,
    title: 'Information Overload',
    body: 'FCA and PRA publish thousands of pages each year. Analysts read linearly, miss cross-references, and flag obligations long after implementation windows have closed.',
  },
  {
    Icon: GitBranch,
    title: 'The Mapping Gap',
    body: 'Obligations sit in PDFs. Controls live in spreadsheets. AI systems exist in Confluence pages. Nothing connects them to the regulatory text that governs them.',
  },
  {
    Icon: ShieldOff,
    title: 'Zero Auditability',
    body: "When a regulator asks who approved what and when, the answer is a chain of forwarded emails. There is no structured record of obligation triage or control mapping decisions.",
  },
  {
    Icon: Brain,
    title: 'AI Governance Blind Spot',
    body: 'Banks deploy AI systems at pace while the FCA demands structured model registers. There is no operational tool linking deployed models to the obligations that govern them.',
  },
]

const STEPS: { num: string; Icon: IconComponent; label: string; desc: string }[] = [
  { num: '01', Icon: Upload,        label: 'Ingest',  desc: 'PDF or web source ingested. Metadata preserved.' },
  { num: '02', Icon: Scan,          label: 'Extract', desc: 'AI extracts discrete obligations from the text.' },
  { num: '03', Icon: Link2,         label: 'Map',     desc: 'Obligations linked to controls and AI systems.' },
  { num: '04', Icon: AlertTriangle, label: 'Impact',  desc: 'Change delta assessed across mapped controls.' },
  { num: '05', Icon: CheckSquare,   label: 'Audit',   desc: 'Full decision trail. Timestamped. Exportable.' },
]

const FEATURES: { name: string; caption: string; image: string }[] = [
  { name: 'Regulatory Ingestion',  caption: 'Upload FCA/PRA documents. Source metadata preserved.',                          image: '/ingestion.jpeg' },
  { name: 'Obligation Explorer',   caption: 'Every extracted obligation, searchable and tagged by type.',                    image: '/obligation.jpeg' },
  { name: 'AI-Assisted Mappings',  caption: 'Work queue for reviewing AI-suggested control links.',                          image: '/mapping.jpeg' },
  { name: 'Controls Catalogue',    caption: 'Structured register of internal controls with status tracking.',                image: '/controls.jpeg' },
  { name: 'Impact Dashboard',      caption: 'When a regulation changes, see exactly which controls are affected.',           image: '/impact.jpeg' },
  { name: 'AI System Registry',    caption: 'AI models mapped to the obligations that govern them.',                         image: '/registry.jpeg' },
]

const D = ['rl-d1', 'rl-d2', 'rl-d3', 'rl-d4', 'rl-d5', 'rl-d6'] as const

function SectionLabel({ text, center }: { text: string; center?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 mb-7 ${center ? 'justify-center' : ''}`}>
      <span className="w-[18px] h-px flex-shrink-0" style={{ background: T }} />
      <span
        className="font-mono text-[10px] font-medium tracking-[0.14em] uppercase"
        style={{ color: T }}
      >
        {text}
      </span>
    </div>
  )
}

function SectionHeading({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <h2
      className={`m-0 font-extrabold tracking-[-0.025em] leading-[1.12] text-[#0f1e3c] ${center ? 'text-center' : ''}`}
      style={{ fontFamily: '"Syne", sans-serif', fontSize: 'clamp(28px, 4vw, 42px)' }}
    >
      {children}
    </h2>
  )
}

const W = 'px-6 sm:px-12 lg:px-20 xl:px-28'

export function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const pc  = Object.assign(document.createElement('link'), { rel: 'preconnect', href: 'https://fonts.googleapis.com' })
    const pc2 = Object.assign(document.createElement('link'), { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' })
    const fl  = Object.assign(document.createElement('link'), {
      rel:  'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&family=DM+Mono:wght@400;500&display=swap',
    })
    document.head.append(pc, pc2, fl)

    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('rl-vis'); io.unobserve(e.target) } }),
      { threshold: 0.08, rootMargin: '0px 0px -48px 0px' },
    )
    pageRef.current?.querySelectorAll<Element>('.rl-up').forEach(el => io.observe(el))

    return () => { io.disconnect(); [pc, pc2, fl].forEach(el => el.remove()) }
  }, [])

  function scrollToDemo(e: React.MouseEvent) {
    e.preventDefault()
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div
      ref={pageRef}
      className="bg-[#faf9f7] text-[#0f1e3c] min-h-screen overflow-x-hidden"
      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
    >
      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 top-0 z-50 border-b border-[#e8e3da]"
        style={{ background: 'rgba(250,249,247,0.94)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
      >
        <div className={`${W} h-[54px] flex items-center justify-between`}>
          <span
            className="font-extrabold text-[17px] tracking-[-0.04em] text-[#0f1e3c]"
            style={{ fontFamily: '"Syne", sans-serif' }}
          >
            RegLens
          </span>
          <div className="flex items-center gap-[18px]">
            <a href="https://github.com/nkemkaakah" target="_blank" rel="noreferrer"
              className="text-[#9aa8ba] hover:text-[#0f1e3c] transition-colors leading-none"
              aria-label="GitHub"
            >
              <GithubIcon size={17} />
            </a>
            <a href="https://linkedin.com/in/nkemka-akah" target="_blank" rel="noreferrer"
              className="text-[#9aa8ba] hover:text-[#0f1e3c] transition-colors leading-none"
              aria-label="LinkedIn"
            >
              <LinkedinIcon size={17} />
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="rl-grid-bg min-h-screen flex items-center justify-center text-center px-6 pt-20 pb-16 relative overflow-hidden">
        {/* Soften grid edges */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 72% 60% at 50% 50%, transparent 20%, #faf9f7 100%)' }}
        />
        <div
          className="absolute bottom-0 inset-x-0 h-44 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #faf9f7)' }}
        />

        <div className="relative max-w-[780px]">
          <div className="rl-hero-up mb-7" style={{ animationDelay: '0s' }}>
            <SectionLabel text="Regulatory Technology · UK Banking" center />
          </div>

          <h1
            className="rl-hero-up font-extrabold m-0 mb-7 text-[#0f1e3c]"
            style={{
              animationDelay: '0.1s',
              fontFamily: '"Syne", sans-serif',
              fontSize: 'clamp(64px, 12vw, 116px)',
              lineHeight: 0.95,
              letterSpacing: '-0.05em',
            }}
          >
            RegLens
          </h1>

          <p
            className="rl-hero-up font-light leading-relaxed tracking-[-0.01em] m-0 mb-3.5 text-[#5a6a82]"
            style={{ animationDelay: '0.2s', fontSize: 'clamp(17px, 2.2vw, 21px)' }}
          >
            Regulatory Change Intelligence for UK Banks.
          </p>

          <p
            className="rl-hero-up leading-[1.75] text-sm max-w-[480px] mx-auto mb-12 text-[#9aa8ba]"
            style={{ animationDelay: '0.3s' }}
          >
            A project by Nkemka Akah — tracing the gap between regulatory publication
            and internal compliance response.
          </p>

          <div
            className="rl-hero-up flex gap-3 justify-center flex-wrap"
            style={{ animationDelay: '0.42s' }}
          >
            <button
              onClick={scrollToDemo}
              className="inline-flex items-center px-[26px] py-[11px] rounded-md text-white text-[13.5px] font-semibold tracking-[0.01em] border-0 cursor-pointer transition-all hover:-translate-y-px"
              style={{ background: T, fontFamily: 'inherit' }}
            >
              See the Build →
            </button>
            <a
              href="https://github.com/nkemkaakah"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-[26px] py-[11px] rounded-md border border-[#dedad2] text-[#5a6a82] text-[13.5px] tracking-[0.01em] no-underline transition-all hover:border-[#0d9488] hover:text-[#0d9488]"
            >
              View on GitHub →
            </a>
          </div>

          <div className="rl-hero-up flex justify-center mt-[72px]" style={{ animationDelay: '0.6s' }}>
            <ChevronDown size={16} className="text-[#9aa8ba]" />
          </div>
        </div>
      </section>

      {/* ── Problem ────────────────────────────────────────────────────────── */}
      <section className="py-[100px] bg-[#f4f1ec]">
        <div className={W}>
          <div className="rl-up mb-[52px]">
            <SectionLabel text="The Problem" />
            <SectionHeading>The Compliance Gap Is Wider<br />Than It Looks</SectionHeading>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PROBLEMS.map(({ Icon, title, body }, i) => (
              <div
                key={title}
                className={`rl-up ${D[i]} flex gap-[18px] bg-white border border-[#e8e3da] rounded-lg p-6 cursor-default transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(13,148,136,0.07)]`}
                style={{ borderLeft: `2px solid ${T}` }}
              >
                <div
                  className="flex-shrink-0 w-[38px] h-[38px] rounded-[7px] flex items-center justify-center"
                  style={{ background: T_BG, color: T }}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <h3
                    className="m-0 mb-[7px] text-[14.5px] font-bold text-[#0f1e3c] tracking-[-0.01em]"
                    style={{ fontFamily: '"Syne", sans-serif' }}
                  >
                    {title}
                  </h3>
                  <p className="m-0 text-[13.5px] text-[#5a6a82] leading-[1.65]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solution ───────────────────────────────────────────────────────── */}
      <section className="py-[100px] bg-[#faf9f7]">
        <div className={W}>
          <div className="rl-up mb-10 text-center">
            <SectionLabel text="How It Works" center />
            <SectionHeading center>End-to-End. In One Workspace.</SectionHeading>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex items-start min-w-[560px]">
              {STEPS.map(({ num, Icon, label, desc }, i) => (
                <Fragment key={label}>
                  <div
                    className={`rl-up ${D[i]} flex-shrink-0 flex flex-col items-center text-center px-2`}
                    style={{ width: `${100 / STEPS.length}%` }}
                  >
                    <span className="font-mono text-[9.5px] tracking-[0.13em] text-[#9aa8ba] mb-2.5">
                      {num}
                    </span>
                    <div
                      className="w-[52px] h-[52px] rounded-full border border-[#e8e3da] flex items-center justify-center mb-3.5 flex-shrink-0"
                      style={{ background: T_BG, color: T }}
                    >
                      <Icon size={20} />
                    </div>
                    <h4
                      className="m-0 mb-1.5 text-[13.5px] font-bold text-[#0f1e3c] tracking-[-0.01em]"
                      style={{ fontFamily: '"Syne", sans-serif' }}
                    >
                      {label}
                    </h4>
                    <p className="m-0 text-xs text-[#5a6a82] leading-relaxed">{desc}</p>
                  </div>

                  {i < STEPS.length - 1 && (
                    <div
                      className="flex-1 h-px flex-shrink-0 self-start mt-[34px]"
                      style={{ background: 'linear-gradient(90deg, #e8e3da, rgba(13,148,136,0.35) 50%, #e8e3da)' }}
                    />
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Photobook ──────────────────────────────────────────────── */}
      <section className="py-[100px] bg-[#f4f1ec]">
        <div className={W}>
          <div className="rl-up mb-[52px]">
            <SectionLabel text="Feature Photobook" />
            <SectionHeading>Inside RegLens</SectionHeading>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {FEATURES.map(({ name, caption, image }, i) => (
              <div
                key={name}
                className={`rl-up ${D[i]} cursor-default transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(13,148,136,0.10)]`}
              >
                {/* Screenshot */}
                <div className="aspect-video border border-[#e8e3da] rounded-lg overflow-hidden">
                  <img
                    src={image}
                    alt={name}
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                </div>

                {/* Caption */}
                <div className="pt-[14px]">
                  <h4
                    className="m-0 mb-[5px] text-[14px] font-bold text-[#0f1e3c] tracking-[-0.01em]"
                    style={{ fontFamily: '"Syne", sans-serif' }}
                  >
                    {name}
                  </h4>
                  <p className="m-0 text-[13px] text-[#5a6a82] leading-relaxed">{caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo Video ─────────────────────────────────────────────────────── */}
      <section id="demo" className="py-20 bg-[#faf9f7]">
        <div className={`${W} text-center`}>
          <div className="rl-up mb-11">
            <SectionLabel text="Demo" center />
            <SectionHeading center>Watch RegLens in Action</SectionHeading>
          </div>

          <div
            className="rl-up rl-d1 aspect-video w-[75%] mx-auto border border-[#e8e3da] rounded-xl flex flex-col items-center justify-center relative overflow-hidden"
            style={{ background: '#f0ece5' }}
          >
            {/* Subtle teal grid */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(13,148,136,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,0.05) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />

            <div className="relative flex flex-col items-center gap-[18px]">
              <div
                className="rl-play-pulse w-[70px] h-[70px] rounded-full flex items-center justify-center"
                style={{ background: T_BG, border: `1px solid rgba(13,148,136,0.3)`, color: T }}
              >
                <Play size={24} style={{ marginLeft: 4 }} />
              </div>
              <div>
                <p
                  className="m-0 mb-1 text-[15px] font-semibold text-[#0f1e3c]"
                  style={{ fontFamily: '"Syne", sans-serif' }}
                >
                  Demo Coming Soon
                </p>
                <span className="font-mono text-[9.5px] tracking-[0.13em] uppercase text-[#9aa8ba]">
                  Recording in progress
                </span>
              </div>
            </div>
          </div>

          <p className="rl-up rl-d2 mt-5 text-[13px] text-[#9aa8ba] italic leading-relaxed">
            A full walkthrough of the ingestion-to-audit workflow. Available shortly.
          </p>
        </div>
      </section>

      {/* ── About ──────────────────────────────────────────────────────────── */}
      <section className="py-[100px] bg-[#f4f1ec]">
        <div className={W}>
          <div className="max-w-[700px]">
            <div className="rl-up mb-10">
              <SectionLabel text="About" />
              <SectionHeading>Why I Built This</SectionHeading>
            </div>

            <p className="rl-up rl-d1 m-0 text-[15.5px] text-[#5a6a82] leading-[1.82]">
              I'm not a compliance analyst. I've never worked in fintech. But I overheard a
              conversation having lunch in Chipotle at Canary Wharf — two people talking about
              how manual and fragmented the whole regulatory change process still is. And I just
              thought, why not? Why not actually try to build something for that?
            </p>

            <p
              className="rl-up rl-d2 mt-7 m-0 text-[15.5px] text-[#0f1e3c] leading-[1.82] pl-5"
              style={{ borderLeft: `2px solid ${T}` }}
            >
              RegLens is what happened when curiosity met a real problem. No agenda really — just
              a genuine interest in the space and a desire to see if I could solve something that
              actually matters.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="py-11 bg-[#faf9f7] border-t border-[#e8e3da]">
        <div className={`${W} flex flex-col items-center gap-[18px]`}>
          <div className="flex gap-7 flex-wrap justify-center">
            <a
              href="https://github.com/nkemkaakah"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-[7px] text-[#9aa8ba] no-underline text-[13px] transition-colors hover:text-[#0f1e3c]"
            >
              <GithubIcon size={15} /> nkemkaakah
            </a>
            <a
              href="https://linkedin.com/in/nkemka-akah"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-[7px] text-[#9aa8ba] no-underline text-[13px] transition-colors hover:text-[#0f1e3c]"
            >
              <LinkedinIcon size={15} /> nkemka-akah
            </a>
            <a
              href="mailto:nkemka@nkemka.dev"
              className="inline-flex items-center gap-[7px] text-[#9aa8ba] no-underline text-[13px] transition-colors hover:text-[#0f1e3c]"
            >
              <Mail size={15} /> nkemka@nkemka.dev
            </a>
          </div>
          <p className="m-0 text-[11.5px] text-[#9aa8ba] font-mono tracking-[0.05em]">
            Built by Nkemka Akah · 2026
          </p>
        </div>
      </footer>
    </div>
  )
}
