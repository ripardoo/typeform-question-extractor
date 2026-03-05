import { lazy, Suspense, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { buildGraph, toMarkdownTable, toMermaidSource } from 'typeform-extractor'
import type { TypeformSchema, FormGraph } from 'typeform-extractor'
import { getFormFromUrl, getMermaidSvgFromGraph } from '../lib/typeform'
import CopyButton from '../components/CopyButton'

const FormGraphViewer = lazy(() => import('../components/FormGraphViewer'))
import { useToast } from '../context/ToastContext'
import { Download, Copy, GitBranch, Image } from 'lucide-react'

export const Route = createFileRoute('/')({ component: App })

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [schema, setSchema] = useState<TypeformSchema | null>(null)
  const { toast } = useToast()

  const { graph, graphError } = useMemo<{ graph: FormGraph | null; graphError: string | null }>(() => {
    if (!schema) return { graph: null, graphError: null }
    try {
      return { graph: buildGraph(schema), graphError: null }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to build form graph.'
      return { graph: null, graphError: msg }
    }
  }, [schema])

  const markdownTable = useMemo<string | null>(() => {
    if (!schema) return null
    try {
      return toMarkdownTable(schema)
    } catch {
      return null
    }
  }, [schema])

  async function handleExtract() {
    const trimmed = url.trim()
    if (!trimmed) {
      setError('Please enter a Typeform URL.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const result = await getFormFromUrl({ data: { url: trimmed } }) as TypeformSchema
      setSchema(result)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not load form.'
      setError(
        message.includes('form: {') || message.includes('marker') || message.includes('No embedded Typeform')
          ? 'No Typeform found at this URL. Check that it\u2019s a valid Typeform link or a page with an embedded Typeform.'
          : message,
      )
      setSchema(null)
    } finally {
      setLoading(false)
    }
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast(`Copied ${label}`, 'success')
    } catch {
      toast(`Failed to copy ${label}`, 'error')
    }
  }

  function handleExportMd() {
    if (!schema || !markdownTable) return
    const fullMd = `# ${schema.title}\n\n${markdownTable}\n`
    copyToClipboard(fullMd, 'Markdown table')
  }

  function handleDownloadMd() {
    if (!schema || !markdownTable) return
    const fullMd = `# ${schema.title}\n\n${markdownTable}\n`
    downloadBlob(fullMd, 'form-fields.md', 'text/markdown')
  }

  function handleExportMermaid() {
    if (!graph) return
    const source = toMermaidSource(graph)
    const md = `# ${graph.title}\n\n\`\`\`mermaid\n${source}\n\`\`\`\n`
    copyToClipboard(md, 'Mermaid chart')
  }

  function handleDownloadMermaid() {
    if (!graph) return
    const source = toMermaidSource(graph)
    const md = `# ${graph.title}\n\n\`\`\`mermaid\n${source}\n\`\`\`\n`
    downloadBlob(md, 'form-graph.md', 'text/markdown')
  }

  async function handleExportSvg() {
    if (!graph) return
    try {
      const svg = await getMermaidSvgFromGraph({ data: { graph } })
      copyToClipboard(svg, 'SVG')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate SVG')
    }
  }

  async function handleDownloadSvg() {
    if (!graph) return
    try {
      const svg = await getMermaidSvgFromGraph({ data: { graph } })
      downloadBlob(svg, 'form-graph.svg', 'image/svg+xml')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate SVG')
    }
  }

  return (
    <div className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">Typeform Schema Extractor</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Extract and visualize your Typeform structure
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Paste a Typeform URL or a page with an embedded Typeform to see an interactive flow and
          export the form as a Markdown table, Mermaid chart, or SVG.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="url"
            placeholder="Paste a Typeform URL or a page with an embedded Typeform"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
            aria-label="Typeform URL"
            className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-base text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--lagoon)]/30"
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleExtract}
            disabled={loading}
            className="rounded-full border border-[var(--chip-line)] bg-[var(--hero-a)] px-5 py-3 text-sm font-semibold text-[var(--lagoon-deep)] transition hover:-translate-y-0.5 hover:bg-[var(--hero-b)] disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {loading ? 'Extracting…' : 'Extract'}
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </section>

      {graphError && (
        <section className="island-shell mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-800/40 dark:bg-red-950/20">
          <p className="mb-1 text-sm font-semibold text-red-700 dark:text-red-400">Could not build form graph</p>
          <p className="text-sm text-red-600 dark:text-red-400/80">{graphError}</p>
        </section>
      )}

      {schema && (graph || markdownTable) && (
        <>
          {graph && (
            <section className="island-shell mt-8 overflow-hidden rounded-2xl">
              <p className="island-kicker mb-2 px-6 pt-6">Form flow</p>
              <div className="h-[500px] w-full px-2 pb-4">
                <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-[var(--sea-ink-soft)]">Loading graph…</div>}>
                  <FormGraphViewer graph={graph} className="h-full w-full rounded-lg" />
                </Suspense>
              </div>
            </section>
          )}

          {markdownTable && (
            <section className="island-shell mt-8 overflow-hidden rounded-2xl p-6">
              <p className="island-kicker mb-4">Fields table</p>
              <div className="markdown-table-wrap overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <div className="prose prose-sm max-w-none prose-table:border-collapse prose-th:border prose-th:border-[var(--line)] prose-th:bg-[var(--foam)] prose-th:px-3 prose-th:py-2 prose-th:text-left prose-td:border prose-td:border-[var(--line)] prose-td:px-3 prose-td:py-2 prose-th:text-[var(--sea-ink)] prose-td:text-[var(--sea-ink)] dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {markdownTable}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <CopyButton onClick={handleExportMd} aria-label="Copy Markdown table">
                  <Copy className="h-4 w-4" /> Copy
                </CopyButton>
                <button
                  type="button"
                  onClick={handleDownloadMd}
                  aria-label="Download Markdown table"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--chip-line)] bg-[var(--hero-a)] px-3 py-2 text-sm font-medium text-[var(--lagoon-deep)] hover:bg-[var(--hero-b)]"
                >
                  <Download className="h-4 w-4" /> Download
                </button>
              </div>
            </section>
          )}

          {graph && (
            <section className="island-shell mt-8 rounded-2xl p-6">
              <p className="island-kicker mb-4">Export</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--foam)]/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-[var(--lagoon-deep)]" />
                    <span className="font-semibold text-[var(--sea-ink)]">Mermaid chart</span>
                  </div>
                  <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">
                    Flowchart source for Mermaid (e.g. in docs or Notion).
                  </p>
                  <div className="flex gap-2">
                    <CopyButton onClick={handleExportMermaid} aria-label="Copy Mermaid chart">
                      <Copy className="h-4 w-4" /> Copy
                    </CopyButton>
                    <button
                      type="button"
                      onClick={handleDownloadMermaid}
                      aria-label="Download Mermaid chart"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--chip-line)] bg-[var(--hero-a)] px-3 py-2 text-sm font-medium text-[var(--lagoon-deep)] hover:bg-[var(--hero-b)]"
                    >
                      <Download className="h-4 w-4" /> Download
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--line)] bg-[var(--foam)]/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Image className="h-5 w-5 text-[var(--lagoon-deep)]" />
                    <span className="font-semibold text-[var(--sea-ink)]">SVG</span>
                  </div>
                  <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">
                    Rendered flowchart as SVG (via Kroki).
                  </p>
                  <div className="flex gap-2">
                    <CopyButton onClick={handleExportSvg} aria-label="Copy SVG">
                      <Copy className="h-4 w-4" /> Copy
                    </CopyButton>
                    <button
                      type="button"
                      onClick={handleDownloadSvg}
                      aria-label="Download SVG"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--chip-line)] bg-[var(--hero-a)] px-3 py-2 text-sm font-medium text-[var(--lagoon-deep)] hover:bg-[var(--hero-b)]"
                    >
                      <Download className="h-4 w-4" /> Download
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
