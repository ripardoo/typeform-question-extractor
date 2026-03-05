import { createFileRoute } from '@tanstack/react-router'
import { Package, Github, Heart, ExternalLink, AlertTriangle } from 'lucide-react'

export const Route = createFileRoute('/about')({
  component: About,
  head: () => ({
    meta: [
      { title: 'About — How to Extract and View All Typeform Questions | Typeform Schema Extractor' },
      {
        name: 'description',
        content:
          'Learn how this open-source tool extracts every question and logic branch from any Typeform so you can prepare answers, audit branching, and export the full structure.',
      },
      { property: 'og:title', content: 'About — How to Extract and View All Typeform Questions' },
      {
        property: 'og:description',
        content:
          'Learn how this open-source tool extracts every question and logic branch from any Typeform so you can prepare answers, audit branching, and export the full structure.',
      },
      { property: 'og:url', content: 'https://gettypeformquestions.com/about' },
      { name: 'twitter:title', content: 'About — How to Extract and View All Typeform Questions' },
      {
        name: 'twitter:description',
        content:
          'Learn how this open-source tool extracts every question and logic branch from any Typeform so you can prepare answers, audit branching, and export the full structure.',
      },
    ],
    links: [{ rel: 'canonical', href: 'https://gettypeformquestions.com/about' }],
  }),
})

function About() {
  return (
    <div className="page-wrap px-4 pb-16 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">About</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Why this project exists
        </h1>
        <p className="max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Born out of frustration with drafting long-form applications one question at a time.
        </p>
      </section>

      <section className="island-shell mt-8 rounded-2xl p-6 sm:p-10">
        <h2 className="island-kicker mb-4">Motivation</h2>
        <div className="max-w-3xl space-y-4 text-base leading-relaxed text-[var(--sea-ink)]">
          <p>
            It all started with a program application that used Typeform. Typeform has a beautiful,
            polished UI &mdash; there's no question about that. But its signature
            one-question-at-a-time experience becomes a real obstacle when you're working on a
            serious application where you need to think carefully about each answer.
          </p>
          <p>
            You can't easily see what's coming next, you can't draft all your responses in a
            separate document without first clicking through every single question, and going back
            and forth to review your answers is tedious. For short surveys it's great. For
            multi-page applications where you want to prepare thoughtful responses? It's a
            terrible experience.
          </p>
          <p>
            So I built this tool. It extracts the full structure of any Typeform &mdash; every
            question, every branch, every condition &mdash; and lays it all out so you can see the
            complete picture at once. You can export it as a Markdown table to draft your answers
            in any editor, or explore the form flow as an interactive graph.
          </p>
          <p>
            Then I decided to make it public so anyone facing the same frustration can use it too.
          </p>
        </div>
      </section>

      <section className="island-shell mt-8 rounded-2xl p-6 sm:p-10">
        <h2 className="island-kicker mb-4">What it does</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <FeatureCard
            title="Extract"
            description="Paste any Typeform URL and the tool fetches the embedded form schema, parsing out every field, logic branch, and thank-you screen."
          />
          <FeatureCard
            title="Visualize"
            description="See the full form flow as an interactive graph with conditional branches highlighted, powered by React Flow and Dagre layout."
          />
          <FeatureCard
            title="Export"
            description="Copy or download the form structure as a Markdown table, Mermaid flowchart, or rendered SVG to use anywhere."
          />
        </div>
      </section>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <section className="island-shell rounded-2xl p-6 sm:p-10">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--chip-line)] bg-[var(--foam)]">
              <Package className="h-5 w-5 text-[var(--lagoon-deep)]" />
            </div>
            <div>
              <h2 className="island-kicker mb-0">npm Package</h2>
            </div>
          </div>
          <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
            The extraction and rendering logic is available as a standalone npm package you can use
            in your own projects.
          </p>
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="m-0 text-sm text-amber-800 dark:text-amber-200">
              The npm package is not yet published. Check back in a couple of days.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--foam)] px-4 py-3">
            <code className="border-0 bg-transparent p-0 text-sm text-[var(--sea-ink)]">
              npm install typeform-extractor
            </code>
          </div>
          <a
            href="https://www.npmjs.com/package/typeform-extractor"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--lagoon-deep)] no-underline hover:text-[var(--link-hover)]"
          >
            View on npm <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>

        <section className="island-shell rounded-2xl p-6 sm:p-10">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--chip-line)] bg-[var(--foam)]">
              <Github className="h-5 w-5 text-[var(--lagoon-deep)]" />
            </div>
            <div>
              <h2 className="island-kicker mb-0">GitHub Repository</h2>
            </div>
          </div>
          <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
            The entire project is open source. Browse the code, open issues, or contribute.
          </p>
          <a
            href="https://github.com/ripardoo/typeform-question-extractor"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--lagoon-deep)] no-underline hover:text-[var(--link-hover)]"
          >
            View on GitHub <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>
      </div>

      <section className="island-shell mt-8 rounded-2xl p-6 sm:p-10">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--chip-line)] bg-[var(--foam)]">
            <Heart className="h-5 w-5 text-[var(--lagoon-deep)]" />
          </div>
          <div>
            <h2 className="island-kicker mb-2">Open Source</h2>
            <p className="max-w-2xl text-base leading-relaxed text-[var(--sea-ink)]">
              This project is free and open source. If you find it useful, consider starring the
              repository, sharing it with others, or contributing back. Bug reports, feature
              requests, and pull requests are all welcome.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="feature-card rounded-xl border border-[var(--line)] p-5 transition-all">
      <h3 className="mb-2 text-base font-semibold text-[var(--sea-ink)]">{title}</h3>
      <p className="m-0 text-sm leading-relaxed text-[var(--sea-ink-soft)]">{description}</p>
    </div>
  )
}
