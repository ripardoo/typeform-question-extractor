import type { TypeformSchema } from './types.js'

// ─── Embedded typeform extraction ────────────────────────────────────────────

export interface EmbeddedTypeformRef {
  formId: string
  url: string
  source: EmbedSource
}

const DIRECT_EMBED_ATTRS = [
  'data-tf-widget',
  'data-tf-popup',
  'data-tf-slider',
  'data-tf-popover',
  'data-tf-sidetab',
] as const

type DirectEmbedAttr = (typeof DIRECT_EMBED_ATTRS)[number]
type EmbedSource = DirectEmbedAttr | 'data-tf-live' | 'url'

const TYPEFORM_API_BASE = 'https://api.typeform.com'
const TYPEFORM_EU_API_BASE = 'https://api.typeform.eu'

/**
 * Resolves a `data-tf-live` token via Typeform's single-embed API.
 * Returns the actual form slug extracted from the response HTML.
 *
 * The embed SDK fetches `GET /single-embed/{token}` which returns
 * `{ type, html }` where html contains a `data-tf-widget="{slug}"` element.
 */
export async function resolveLiveEmbedToken(
  token: string,
  region?: string,
): Promise<{ formId: string; url: string }> {
  const base = region === 'eu' ? TYPEFORM_EU_API_BASE : TYPEFORM_API_BASE
  const res = await fetch(`${base}/single-embed/${token}`)
  if (!res.ok) throw new Error(`Failed to resolve live embed token ${token}: ${res.status}`)

  const data = (await res.json()) as { html: string }
  const widgetMatch = /data-tf-widget="([^"]+)"/.exec(data.html)
  if (!widgetMatch) throw new Error(`No data-tf-widget found in live embed response for ${token}`)

  const formId = widgetMatch[1]!
  return { formId, url: `https://form.typeform.com/to/${formId}` }
}

/**
 * Scans HTML for embedded Typeform references — `data-tf-*` SDK attributes
 * and direct `*.typeform.com/to/{id}` URLs. Returns deduplicated results.
 *
 * Handles HTML-encoded quotes (`&quot;`) which appear inside iframe `srcdoc`
 * attributes on sites like Framer.
 *
 * For `data-tf-live` tokens (which are opaque IDs, not form slugs), call
 * `resolveLiveEmbedToken` to resolve them to actual form URLs.
 */
export function extractEmbeddedTypeformIds(html: string): EmbeddedTypeformRef[] {
  const results: EmbeddedTypeformRef[] = []
  const seen = new Set<string>()

  const add = (formId: string, source: EmbedSource, url?: string) => {
    if (seen.has(formId)) return
    seen.add(formId)
    results.push({
      formId,
      url: url ?? `https://form.typeform.com/to/${formId}`,
      source,
    })
  }

  for (const attr of DIRECT_EMBED_ATTRS) {
    const plain = new RegExp(`${attr}=["']([^"']+)["']`, 'gi')
    const encoded = new RegExp(`${attr}=&quot;([^&]+)&quot;`, 'gi')

    for (const re of [plain, encoded]) {
      let m: RegExpExecArray | null
      while ((m = re.exec(html)) !== null) add(m[1]!, attr)
    }
  }

  // data-tf-live tokens are opaque IDs — the url is a placeholder until resolved
  const livePlain = /data-tf-live=["']([^"']+)["']/gi
  const liveEncoded = /data-tf-live=&quot;([^&]+)&quot;/gi
  for (const re of [livePlain, liveEncoded]) {
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) add(m[1]!, 'data-tf-live')
  }

  const urlRe = /https?:\/\/[a-z0-9-]+\.typeform\.com\/to\/([a-zA-Z0-9]+)/gi
  let m: RegExpExecArray | null
  while ((m = urlRe.exec(html)) !== null) add(m[1]!, 'url', m[0])

  return results
}

/**
 * Fetches a webpage, discovers any embedded Typeform references, resolves
 * `data-tf-live` tokens via the Typeform API, then fetches and returns the
 * schema for the first form found.
 *
 * Throws if the page contains no recognisable Typeform embed.
 */
export async function getTypeformSchemaFromPage(pageUrl: string): Promise<{
  schema: TypeformSchema
  ref: EmbeddedTypeformRef
  allRefs: EmbeddedTypeformRef[]
}> {
  const res = await fetch(pageUrl)
  if (!res.ok) throw new Error(`Failed to fetch page: ${res.status} ${res.statusText}`)
  const html = await res.text()

  const allRefs = extractEmbeddedTypeformIds(html)
  if (allRefs.length === 0) {
    throw new Error('No embedded Typeform found on the page')
  }

  // Resolve any data-tf-live tokens to actual form slugs
  for (let i = 0; i < allRefs.length; i++) {
    const ref = allRefs[i]!
    if (ref.source === 'data-tf-live') {
      const regionMatch = /data-tf-region=["']([^"']+)["']/i.exec(html)
        ?? /data-tf-region=&quot;([^&]+)&quot;/i.exec(html)
      const resolved = await resolveLiveEmbedToken(ref.formId, regionMatch?.[1])
      allRefs[i] = { ...resolved, source: 'data-tf-live' }
    }
  }

  const ref = allRefs[0]!
  const schema = await getTypeformSchema(ref.url)
  return { schema, ref, allRefs }
}

// ─── Direct typeform HTML extraction ─────────────────────────────────────────

export function extractFormJson(html: string): TypeformSchema {
  const marker = 'form: {'
  const markerIdx = html.indexOf(marker)
  if (markerIdx === -1) throw new Error('"form: {" marker not found in HTML')

  let depth = 0
  let start = -1
  let inString = false
  let escaped = false

  for (let i = markerIdx + marker.length - 1; i < html.length; i++) {
    const ch = html[i]

    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\' && inString) {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) {
        return JSON.parse(html.slice(start, i + 1))
      }
    }
  }

  throw new Error('Could not find matching closing brace for form object')
}

export async function getTypeformSchema(url: string): Promise<TypeformSchema> {
  const response = await fetch(url)
  const html = await response.text()
  return extractFormJson(html)
}

/**
 * Like `getTypeformSchema`, but accepts the URL of a page that *embeds* a
 * Typeform (e.g. a Framer or Webflow site). Discovers the embedded form,
 * resolves `data-tf-live` tokens if needed, and returns the schema.
 */
export async function getEmbeddedTypeformSchema(pageUrl: string): Promise<TypeformSchema> {
  const { schema } = await getTypeformSchemaFromPage(pageUrl)
  return schema
}
