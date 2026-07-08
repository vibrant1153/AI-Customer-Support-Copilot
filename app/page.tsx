import Link from 'next/link';

export default function LandingPage() {
  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-200 relative overflow-hidden"
      style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
    >
      {/* Ambient background glow — same visual language as the app itself */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-blue-600/20 blur-[130px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] rounded-full bg-purple-600/20 blur-[130px]" />
        <div className="absolute top-[35%] right-[15%] w-[20%] h-[20%] rounded-full bg-amber-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* ── Nav ─────────────────────────────────────────── */}
        <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <span
            className="text-lg font-semibold tracking-tight text-white"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}
          >
            Copilot<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">AI</span>
          </span>
          <div className="hidden sm:flex items-center gap-8 text-sm text-slate-400">
            <a href="#how-it-works" className="hover:text-slate-200 transition-colors">How it works</a>
            <a href="#modes" className="hover:text-slate-200 transition-colors">Two ways to work</a>
          </div>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:opacity-90 transition-opacity"
          >
            Get started
          </Link>
        </nav>

        {/* ── Hero ────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-28 grid lg:grid-cols-2 gap-16 items-center">
          <div className="landing-fade-in">
            <p
              className="text-xs font-medium tracking-[0.2em] text-blue-400 mb-5"
              style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
            >
              AI CUSTOMER SUPPORT, DRAFTED FOR YOU
            </p>
            <h1
              className="text-5xl sm:text-6xl leading-[1.05] text-white mb-6"
              style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 500 }}
            >
              Your inbox already works.
              <br />
              <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Now it answers itself.
              </span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed mb-9 max-w-md">
              Copilot reads new support emails, drafts a reply grounded in your own
              documentation, and drops it right into Gmail — as a draft, never sent
              without you.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="px-6 py-3 text-sm font-medium rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-[0_0_25px_rgba(79,70,229,0.45)] hover:opacity-90 transition-opacity"
              >
                Get started free
              </Link>
              <a
                href="#how-it-works"
                className="px-6 py-3 text-sm font-medium rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
              >
                See how it works
              </a>
            </div>
          </div>

          {/* Signature hero mockup: a Gmail thread with a draft materializing beside it */}
          <div className="relative landing-fade-in-delayed">
            <div
              className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[1.75rem] shadow-[0_20px_60px_0_rgba(0,0,0,0.55)] p-6 mx-auto max-w-md"
              style={{ transform: 'perspective(1400px) rotateY(-6deg) rotateX(2deg)' }}
            >
              <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                <span className="ml-2">Gmail — Refund not received yet</span>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-4 mb-4">
                <p className="text-sm font-medium text-white mb-1">Jordan Reyes</p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Hi, I cancelled my subscription two weeks ago and was told I&apos;d
                  get a refund within 5&ndash;7 business days. It&apos;s been 14 days...
                </p>
              </div>

              <div className="relative rounded-xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-white/10 p-4 landing-draft-reveal">
                <div className="flex items-center gap-1.5 text-xs text-purple-300 mb-2">
                  <span className="landing-sparkle">✦</span> AI Draft Reply
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Hi Jordan — I can see your cancellation went through on the 24th...
                </p>

                <span
                  className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-amber-500/90 text-slate-950 text-xs font-semibold shadow-[0_4px_16px_rgba(245,158,11,0.4)] landing-badge-pop"
                  style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                >
                  94% confident
                </span>
              </div>
            </div>

            {/* Depth layers behind the card, creating the isometric/layered feel */}
            <div className="absolute inset-0 -z-10 translate-x-4 translate-y-4 bg-white/[0.02] border border-white/5 rounded-[1.75rem] max-w-md mx-auto" />
            <div className="absolute inset-0 -z-20 translate-x-8 translate-y-8 bg-white/[0.015] border border-white/5 rounded-[1.75rem] max-w-md mx-auto" />
          </div>
        </section>

        {/* ── How it works ───────────────────────────────── */}
        <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-24">
          <h2
            className="text-3xl sm:text-4xl text-white mb-16 text-center"
            style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 500 }}
          >
            Three steps. No new habits.
          </h2>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                mark: '&gt;',
                title: 'Upload what you already have',
                body: 'Your docs, policies, and FAQs become the source of truth Copilot answers from.',
              },
              {
                mark: '&gt;&gt;',
                title: 'A customer emails your support address',
                body: 'Nothing changes for them — they email you like they always have.',
              },
              {
                mark: '&gt;&gt;&gt;',
                title: 'A draft reply appears',
                body: 'Grounded only in your content, with a confidence score so you know what to double-check.',
              },
            ].map((step) => (
              <div key={step.title} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                <p
                  className="text-blue-400 mb-4 text-lg"
                  style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                  dangerouslySetInnerHTML={{ __html: step.mark }}
                />
                <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Two modes ───────────────────────────────────── */}
        <section id="modes" className="max-w-5xl mx-auto px-6 py-24">
          <h2
            className="text-3xl sm:text-4xl text-white mb-4 text-center"
            style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 500 }}
          >
            Two ways to work
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-lg mx-auto">
            Choose per organization — switch anytime.
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-purple-600/[0.07] to-blue-600/[0.07] border border-white/10 rounded-[1.5rem] p-8">
              <p
                className="text-xs tracking-[0.15em] text-purple-300 mb-3"
                style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
              >
                GMAIL NATIVE
              </p>
              <h3 className="text-xl font-semibold text-white mb-3">Never leave Gmail</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Drafts appear as real replies in the original thread. Review and hit send
                — right from the inbox your team already lives in.
              </p>
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-8">
              <p
                className="text-xs tracking-[0.15em] text-blue-300 mb-3"
                style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
              >
                HOSTED INBOX
              </p>
              <h3 className="text-xl font-semibold text-white mb-3">One dedicated queue</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Prefer a single place to work? Review, edit, and approve every draft
                before anything goes out — all in one dashboard.
              </p>
            </div>
          </div>
        </section>

        {/* ── Features ────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-6 py-24">
          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-10">
            {[
              {
                title: 'Grounded in your content',
                body: "If it's not in your docs, Copilot says so — instead of guessing.",
              },
              {
                title: 'Confidence, not guesswork',
                body: 'Every draft ships with a score, so your team knows what to double-check.',
              },
              {
                title: 'Isolated by design',
                body: "Every organization's documents and conversations stay fully separate.",
              },
              {
                title: 'Threaded like a human wrote it',
                body: 'Replies land in the original Gmail thread, not a disconnected new email.',
              },
            ].map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold mb-1.5">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-6 py-24 text-center">
          <h2
            className="text-3xl sm:text-4xl text-white mb-8"
            style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 500 }}
          >
            Start drafting smarter replies.
          </h2>
          <Link
            href="/register"
            className="inline-block px-7 py-3.5 text-sm font-medium rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-[0_0_25px_rgba(79,70,229,0.45)] hover:opacity-90 transition-opacity"
          >
            Get started free
          </Link>
        </section>

        {/* ── Footer ──────────────────────────────────────── */}
        <footer className="max-w-6xl mx-auto px-6 py-10 border-t border-white/10 flex items-center justify-between text-sm text-slate-500">
          <span style={{ fontFamily: 'var(--font-fraunces), serif' }}>CopilotAI</span>
          <span>&copy; 2026</span>
        </footer>
      </div>

      <style>{`
        @keyframes landingFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes landingDraftReveal {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes landingBadgePop {
          0% { opacity: 0; transform: scale(0.6); }
          70% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes landingSparkle {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .landing-fade-in {
          animation: landingFadeIn 0.7s ease-out both;
        }
        .landing-fade-in-delayed {
          animation: landingFadeIn 0.7s ease-out 0.15s both;
        }
        .landing-draft-reveal {
          animation: landingDraftReveal 0.6s ease-out 0.9s both;
        }
        .landing-badge-pop {
          animation: landingBadgePop 0.5s ease-out 1.4s both;
        }
        .landing-sparkle {
          display: inline-block;
          animation: landingSparkle 2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-fade-in,
          .landing-fade-in-delayed,
          .landing-draft-reveal,
          .landing-badge-pop,
          .landing-sparkle {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}