import { Link } from 'react-router-dom'
import {
  Zap,
  Upload,
  BrainCircuit,
  ClipboardCheck,
  Files,
  BarChart2,
  GitBranch,
  Wifi,
  Users,
  Code2,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'

const STEPS = [
  {
    number: '01',
    icon: <Upload className="w-6 h-6" />,
    title: 'Upload',
    description: 'Drag and drop any document. PDF, DOCX, TXT, images. Upload multiple files at once.',
  },
  {
    number: '02',
    icon: <BrainCircuit className="w-6 h-6" />,
    title: 'AI Extracts',
    description: 'Our AI reads your document and extracts structured fields automatically — with a confidence score on every value.',
  },
  {
    number: '03',
    icon: <ClipboardCheck className="w-6 h-6" />,
    title: 'Review & Export',
    description: 'Approve results or correct low-confidence fields in the review queue. Then export clean, structured data.',
  },
]

const USE_CASES = [
  {
    emoji: '🧾',
    title: 'Accounting',
    description: 'Process hundreds of invoices per month without manual data entry. Extract vendor, amount, due date, and line items automatically.',
  },
  {
    emoji: '⚖️',
    title: 'Legal',
    description: 'Extract key dates, parties, and contract values automatically. Flag clauses that need human review and never miss a deadline.',
  },
  {
    emoji: '📦',
    title: 'Operations',
    description: 'Turn purchase orders, shipping documents, and reports into structured database records — in seconds, not hours.',
  },
]

const FEATURES = [
  { icon: <Files className="w-5 h-5" />,       title: 'Multi-file upload',         description: 'Drop batches of files at once and track processing in real time.' },
  { icon: <BarChart2 className="w-5 h-5" />,   title: 'Per-field confidence',      description: 'Every extracted value ships with a score so you know what to trust.' },
  { icon: <GitBranch className="w-5 h-5" />,   title: 'Visual pipeline builder',   description: 'Compose Extract → Validate → Transform → Deliver stages with drag-and-drop.' },
  { icon: <Wifi className="w-5 h-5" />,        title: 'Real-time updates',         description: 'Processing status pushed over WebSocket — no refresh needed.' },
  { icon: <Users className="w-5 h-5" />,       title: 'Human review queue',        description: 'Low-confidence results are flagged for inline editing before they move on.' },
  { icon: <Code2 className="w-5 h-5" />,       title: 'REST API access',           description: 'Full API with JWT auth and Swagger docs. Integrate with anything.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface text-slate-100">
      {/* Nav */}
      <header className="border-b border-surface-3 bg-surface-1/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-brand" />
            <span className="text-base font-bold tracking-tight">DocFlow AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-surface-3 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-brand hover:bg-brand-hover text-white transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Subtle radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-start justify-center"
        >
          <div className="w-[800px] h-[500px] rounded-full bg-brand/10 blur-3xl -translate-y-1/2" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-50 leading-tight">
            Turn Documents Into<br />
            <span className="text-brand-light">Structured Data</span> — Instantly
          </h1>

          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Upload invoices, contracts, and reports. AI extracts the fields you need with confidence scores.
            Review exceptions. Export results.
          </p>

          <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-medium px-6 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-brand/20"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-surface-2 hover:bg-surface-3 border border-surface-3 text-slate-200 font-medium px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Sign In
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-600">No credit card required · Free to get started</p>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">How it works</h2>
          <p className="mt-2 text-slate-500 text-sm">From upload to structured data in three steps</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <div key={i} className="relative flex flex-col gap-4 bg-surface-1 border border-surface-3 rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-brand-light opacity-60">{step.number}</span>
                <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light">
                  {step.icon}
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100">{step.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{step.description}</p>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden sm:block absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 text-surface-3 z-10" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="bg-surface-1 border-y border-surface-3">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">Built for every team</h2>
            <p className="mt-2 text-slate-500 text-sm">From accounting to legal to operations</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {USE_CASES.map((uc, i) => (
              <div key={i} className="bg-surface-2 border border-surface-3 rounded-2xl p-6 hover:border-brand/30 transition-colors">
                <span className="text-3xl">{uc.emoji}</span>
                <h3 className="mt-3 text-base font-semibold text-slate-100">{uc.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{uc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">Everything you need</h2>
          <p className="mt-2 text-slate-500 text-sm">A complete platform, not just a parser</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex gap-4 bg-surface-1 border border-surface-3 rounded-xl p-5 hover:border-brand/30 transition-colors">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light">
                {f.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">{f.title}</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-surface-3 bg-surface-1">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 mb-6">
            <Zap className="w-7 h-7 text-brand-light" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 leading-snug">
            Ready to automate your<br />document processing?
          </h2>
          <p className="mt-4 text-slate-500 text-sm max-w-md mx-auto">
            Join teams already extracting structured data from their documents in seconds.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-medium px-7 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-brand/20"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <ul className="mt-6 flex items-center justify-center gap-5 flex-wrap text-xs text-slate-600">
            {['No credit card required', 'Free to get started', 'Full API access'].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-600" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-3">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-brand/60" />
            <span>DocFlow AI</span>
          </div>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
