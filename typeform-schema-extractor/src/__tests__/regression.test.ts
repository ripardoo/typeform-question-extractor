import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFile, stat, rm, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'

import {
  extractFormJson,
  getTypeformSchema,
  extractEmbeddedTypeformIds,
  buildGraph,
  toMermaidSource,
  getMermaidSvg,
  saveMermaidMd,
  saveMarkdownTable,
  saveReactFlowHtml,
  toMarkdownTable,
} from '../index.js'
import type { TypeformSchema, FormGraph } from '../types.js'

// ─── Paths ───────────────────────────────────────────────────────────────────

const PROJECT_ROOT = join(import.meta.dirname, '..', '..', '..')
const TEST_FILES = join(PROJECT_ROOT, 'test_files')
const URLS_FILE = join(TEST_FILES, 'urls.txt')
const SCHEMA_FILE = join(TEST_FILES, 'speedrunSchema.json')
const HTML_FILE = join(TEST_FILES, 'speedrunForm.html')
const EMBEDDED_HTML_FILE = join(TEST_FILES, 'embeddedTypeform.html')

const testFilesExist = existsSync(TEST_FILES)

// ─── URL availability gate ───────────────────────────────────────────────────

const urlStatus = new Map<string, boolean>()
let urls: string[] = []
let krokiAvailable = false

beforeAll(async () => {
  if (!testFilesExist || !existsSync(URLS_FILE)) return

  const raw = await readFile(URLS_FILE, 'utf-8')
  urls = raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  await Promise.all(
    urls.map(async url => {
      try {
        const res = await fetch(url, { method: 'GET', redirect: 'follow' })
        urlStatus.set(url, res.ok)
      } catch {
        urlStatus.set(url, false)
      }
    }),
  )

  try {
    const res = await fetch('https://kroki.io/mermaid/svg', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'flowchart TD\n  A-->B',
      signal: AbortSignal.timeout(10_000),
    })
    krokiAvailable = res.ok
  } catch {
    krokiAvailable = false
  }
})

const availableUrls = () => urls.filter(u => urlStatus.get(u) === true)

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loadLocalSchema(): Promise<TypeformSchema> {
  const raw = await readFile(SCHEMA_FILE, 'utf-8')
  const full = JSON.parse(raw)
  return {
    title: full.title,
    fields: full.fields,
    logic: full.logic,
    thankyou_screens: full.thankyou_screens,
  }
}

// ─── 1. URL availability ─────────────────────────────────────────────────────

describe('URL availability', () => {
  it.runIf(testFilesExist)('urls.txt exists and contains URLs', () => {
    expect(urls.length).toBeGreaterThan(0)
  })

  it.runIf(testFilesExist)('reports reachability for each URL', () => {
    for (const url of urls) {
      expect(urlStatus.has(url)).toBe(true)
    }
    if (availableUrls().length === 0) {
      console.warn('⚠ No remote Typeform URLs are reachable — remote tests will be skipped')
    }
  })
})

// ─── 2. extractFormJson (unit — local files) ─────────────────────────────────

describe.runIf(testFilesExist)('extractFormJson', () => {
  let schema: TypeformSchema

  beforeAll(async () => {
    const html = await readFile(HTML_FILE, 'utf-8')
    schema = extractFormJson(html)
  })

  it('returns a schema with the expected title', () => {
    expect(schema.title).toBe('Speedrun Alpha Application - edited by tonik®')
  })

  it('has the expected number of fields', () => {
    expect(schema.fields).toHaveLength(33)
  })

  it('every field has required properties', () => {
    for (const field of schema.fields) {
      expect(field).toHaveProperty('id')
      expect(field).toHaveProperty('ref')
      expect(field).toHaveProperty('title')
      expect(field).toHaveProperty('type')
      expect(typeof field.id).toBe('string')
      expect(typeof field.ref).toBe('string')
      expect(typeof field.title).toBe('string')
      expect(typeof field.type).toBe('string')
    }
  })

  it('contains all expected field types', () => {
    const types = new Set(schema.fields.map(f => f.type))
    for (const t of ['email', 'website', 'short_text', 'long_text', 'multiple_choice', 'date', 'dropdown', 'file_upload', 'checkbox']) {
      expect(types).toContain(t)
    }
  })

  it('has thankyou_screens', () => {
    expect(schema.thankyou_screens).toBeDefined()
    expect(schema.thankyou_screens).toHaveLength(2)
  })

  it('has logic entries', () => {
    expect(schema.logic).toBeDefined()
    expect(schema.logic!.length).toBeGreaterThan(0)
  })

  it('logic entries reference valid field refs', () => {
    const fieldRefs = new Set(schema.fields.map(f => f.ref))
    for (const entry of schema.logic!) {
      expect(fieldRefs).toContain(entry.ref)
    }
  })

  it('throws when marker is not found', () => {
    expect(() => extractFormJson('')).toThrow('"form: {" marker not found')
    expect(() => extractFormJson('<html>no form here</html>')).toThrow('"form: {" marker not found')
  })

  it('throws when closing brace is missing', () => {
    expect(() => extractFormJson('form: { "title": "test"')).toThrow('Could not find matching closing brace')
  })

  it('handles form with minimal valid JSON', () => {
    const html = 'some prefix form: {"title":"t","fields":[]} some suffix'
    const result = extractFormJson(html)
    expect(result.title).toBe('t')
    expect(result.fields).toEqual([])
  })

  it('handles escaped quotes inside strings', () => {
    const html = 'form: {"title":"a \\"quoted\\" title","fields":[]}'
    const result = extractFormJson(html)
    expect(result.title).toBe('a "quoted" title')
    expect(result.fields).toEqual([])
  })

  it('handles nested braces in JSON', () => {
    const html = 'form: {"title":"t","fields":[{"id":"1","ref":"r","title":"q","type":"short_text","properties":{"nested":{"deep":true}}}]}'
    const result = extractFormJson(html)
    expect(result.fields).toHaveLength(1)
    expect(result.fields[0]!.properties).toEqual({ nested: { deep: true } })
  })
})

// ─── 2b. extractEmbeddedTypeformIds (unit) ───────────────────────────────────

describe('extractEmbeddedTypeformIds', () => {
  it('extracts data-tf-widget form IDs', () => {
    const html = '<div data-tf-widget="abc123"></div>'
    const refs = extractEmbeddedTypeformIds(html)
    expect(refs).toHaveLength(1)
    expect(refs[0]!.formId).toBe('abc123')
    expect(refs[0]!.url).toBe('https://form.typeform.com/to/abc123')
    expect(refs[0]!.source).toBe('data-tf-widget')
  })

  it('extracts data-tf-popup form IDs', () => {
    const html = '<button data-tf-popup="xyz789">Open</button>'
    const refs = extractEmbeddedTypeformIds(html)
    expect(refs).toHaveLength(1)
    expect(refs[0]!.formId).toBe('xyz789')
    expect(refs[0]!.source).toBe('data-tf-popup')
  })

  it('extracts data-tf-slider, data-tf-popover, data-tf-sidetab', () => {
    const html = `
      <div data-tf-slider="s1"></div>
      <div data-tf-popover="p1"></div>
      <div data-tf-sidetab="t1"></div>
    `
    const refs = extractEmbeddedTypeformIds(html)
    expect(refs).toHaveLength(3)
    expect(refs.map(r => r.formId).sort()).toEqual(['p1', 's1', 't1'])
  })

  it('extracts data-tf-live tokens', () => {
    const html = '<div data-tf-live="01KHM5SB7KRQ76JSASB64EAH9E"></div>'
    const refs = extractEmbeddedTypeformIds(html)
    expect(refs).toHaveLength(1)
    expect(refs[0]!.formId).toBe('01KHM5SB7KRQ76JSASB64EAH9E')
    expect(refs[0]!.source).toBe('data-tf-live')
  })

  it('handles HTML-encoded quotes from iframe srcdoc', () => {
    const html = '<iframe srcdoc="<div data-tf-live=&quot;TOKEN123&quot;></div>"></iframe>'
    const refs = extractEmbeddedTypeformIds(html)
    expect(refs).toHaveLength(1)
    expect(refs[0]!.formId).toBe('TOKEN123')
    expect(refs[0]!.source).toBe('data-tf-live')
  })

  it('extracts direct typeform URLs', () => {
    const html = '<iframe src="https://myworkspace.typeform.com/to/AbCdEf"></iframe>'
    const refs = extractEmbeddedTypeformIds(html)
    expect(refs).toHaveLength(1)
    expect(refs[0]!.formId).toBe('AbCdEf')
    expect(refs[0]!.url).toBe('https://myworkspace.typeform.com/to/AbCdEf')
    expect(refs[0]!.source).toBe('url')
  })

  it('deduplicates results by form ID', () => {
    const html = `
      <div data-tf-widget="abc123"></div>
      <a href="https://form.typeform.com/to/abc123">link</a>
    `
    const refs = extractEmbeddedTypeformIds(html)
    expect(refs).toHaveLength(1)
  })

  it('finds multiple different forms on the same page', () => {
    const html = `
      <div data-tf-widget="form1"></div>
      <div data-tf-popup="form2"></div>
    `
    const refs = extractEmbeddedTypeformIds(html)
    expect(refs).toHaveLength(2)
  })

  it('returns empty array when no typeform is found', () => {
    const refs = extractEmbeddedTypeformIds('<html><body>Hello</body></html>')
    expect(refs).toHaveLength(0)
  })

  it.runIf(testFilesExist)('extracts the live embed token from the embedded test file', async () => {
    const html = await readFile(EMBEDDED_HTML_FILE, 'utf-8')
    const refs = extractEmbeddedTypeformIds(html)
    expect(refs.length).toBeGreaterThan(0)
    const liveRef = refs.find(r => r.source === 'data-tf-live')
    expect(liveRef).toBeDefined()
    expect(liveRef!.formId).toBe('01KHM5SB7KRQ76JSASB64EAH9E')
  })
})

// ─── 3. getTypeformSchema (integration — remote URLs) ────────────────────────

describe('getTypeformSchema (remote)', () => {
  it.runIf(testFilesExist)('fetches and parses each available URL', async () => {
    const reachable = availableUrls()
    if (reachable.length === 0) return

    for (const url of reachable) {
      const schema = await getTypeformSchema(url)
      expect(schema.title).toBeTruthy()
      expect(schema.fields.length).toBeGreaterThan(0)
      for (const field of schema.fields) {
        expect(field).toHaveProperty('id')
        expect(field).toHaveProperty('ref')
        expect(field).toHaveProperty('title')
        expect(field).toHaveProperty('type')
      }
    }
  })
})

// ─── 4. buildGraph (unit — local schema) ─────────────────────────────────────

describe.runIf(testFilesExist)('buildGraph', () => {
  let schema: TypeformSchema
  let graph: FormGraph

  beforeAll(async () => {
    schema = await loadLocalSchema()
    graph = buildGraph(schema)
  })

  it('produces the correct number of nodes (fields + thankyou_screens)', () => {
    const expected = schema.fields.length + (schema.thankyou_screens?.length ?? 0)
    expect(graph.nodes).toHaveLength(expected)
  })

  it('has non-empty edges', () => {
    expect(graph.edges.length).toBeGreaterThan(0)
  })

  it('preserves the form title', () => {
    expect(graph.title).toBe(schema.title)
  })

  it('every node has required properties', () => {
    for (const node of graph.nodes) {
      expect(node).toHaveProperty('id')
      expect(node).toHaveProperty('ref')
      expect(node).toHaveProperty('label')
      expect(node).toHaveProperty('fieldType')
      expect(typeof node.isEnd).toBe('boolean')
    }
  })

  it('thankyou_screen nodes have isEnd = true', () => {
    const tyRefs = new Set((schema.thankyou_screens ?? []).map(s => s.ref))
    for (const node of graph.nodes) {
      if (tyRefs.has(node.ref)) {
        expect(node.isEnd).toBe(true)
        expect(node.fieldType).toBe('thankyou_screen')
      }
    }
  })

  it('field nodes have isEnd = false', () => {
    const fieldRefs = new Set(schema.fields.map(f => f.ref))
    for (const node of graph.nodes) {
      if (fieldRefs.has(node.ref)) {
        expect(node.isEnd).toBe(false)
      }
    }
  })

  it('all edges reference valid node IDs', () => {
    const nodeIds = new Set(graph.nodes.map(n => n.id))
    for (const edge of graph.edges) {
      expect(nodeIds).toContain(edge.from)
      expect(nodeIds).toContain(edge.to)
    }
  })

  it('edge types are only sequential, conditional, or default', () => {
    const validTypes = new Set(['sequential', 'conditional', 'default'])
    for (const edge of graph.edges) {
      expect(validTypes).toContain(edge.edgeType)
    }
  })

  it('fields with logic produce conditional or default edges, not sequential', () => {
    const logicRefs = new Set((schema.logic ?? []).map(l => l.ref))
    const edgesFromLogicFields = graph.edges.filter(e => logicRefs.has(e.from))
    expect(edgesFromLogicFields.length).toBeGreaterThan(0)
    for (const edge of edgesFromLogicFields) {
      expect(edge.edgeType).not.toBe('sequential')
    }
  })

  it('fields without logic produce sequential edges', () => {
    const logicRefs = new Set((schema.logic ?? []).map(l => l.ref))
    const fieldRefs = schema.fields.map(f => f.ref)
    const nonLogicFieldRefs = fieldRefs.filter(r => !logicRefs.has(r))
    const sequentialEdges = graph.edges.filter(
      e => nonLogicFieldRefs.includes(e.from) && e.edgeType === 'sequential',
    )
    expect(sequentialEdges.length).toBeGreaterThan(0)
  })

  it('labels are truncated to at most 65 characters', () => {
    for (const node of graph.nodes) {
      expect(node.label.length).toBeLessThanOrEqual(65)
    }
  })

  it('every edge has a unique id', () => {
    const ids = graph.edges.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('works with a minimal schema (no logic, no thankyou_screens)', () => {
    const minimal: TypeformSchema = {
      title: 'Minimal',
      fields: [
        { id: '1', ref: 'a', title: 'Q1', type: 'short_text' },
        { id: '2', ref: 'b', title: 'Q2', type: 'email' },
      ],
    }
    const g = buildGraph(minimal)
    expect(g.nodes).toHaveLength(2)
    expect(g.edges).toHaveLength(1)
    expect(g.edges[0]!.from).toBe('a')
    expect(g.edges[0]!.to).toBe('b')
    expect(g.edges[0]!.edgeType).toBe('sequential')
  })

  it('works with a single field and no logic', () => {
    const single: TypeformSchema = {
      title: 'Single',
      fields: [{ id: '1', ref: 'x', title: 'Only', type: 'short_text' }],
    }
    const g = buildGraph(single)
    expect(g.nodes).toHaveLength(1)
    expect(g.edges).toHaveLength(0)
  })

  it('connects last field to default thankyou_screen', () => {
    const withTy: TypeformSchema = {
      title: 'WithTY',
      fields: [
        { id: '1', ref: 'a', title: 'Q1', type: 'short_text' },
      ],
      thankyou_screens: [
        { id: 'ty1', ref: 'default_tys', title: 'Thanks', type: 'thankyou_screen' },
      ],
    }
    const g = buildGraph(withTy)
    expect(g.nodes).toHaveLength(2)
    expect(g.edges).toHaveLength(1)
    expect(g.edges[0]!.from).toBe('a')
    expect(g.edges[0]!.to).toBe('default_tys')
    expect(g.edges[0]!.edgeType).toBe('sequential')
  })
})

// ─── 5. toMermaidSource (unit) ───────────────────────────────────────────────

describe.runIf(testFilesExist)('toMermaidSource', () => {
  let graph: FormGraph
  let mermaid: string

  beforeAll(async () => {
    const schema = await loadLocalSchema()
    graph = buildGraph(schema)
    mermaid = toMermaidSource(graph)
  })

  it('starts with flowchart TD', () => {
    expect(mermaid.startsWith('flowchart TD')).toBe(true)
  })

  it('contains node definitions with underscored IDs', () => {
    for (const node of graph.nodes.slice(0, 5)) {
      const escapedId = node.id.replace(/-/g, '_')
      expect(mermaid).toContain(escapedId)
    }
  })

  it('contains edge arrows', () => {
    expect(mermaid).toContain('-->')
  })

  it('contains class definitions for endNode and fieldNode', () => {
    expect(mermaid).toContain('classDef endNode')
    expect(mermaid).toContain('classDef fieldNode')
  })

  it('end nodes use stadium shape (rounded)', () => {
    const endNodes = graph.nodes.filter(n => n.isEnd)
    for (const node of endNodes) {
      const id = node.id.replace(/-/g, '_')
      expect(mermaid).toMatch(new RegExp(`${id}\\(\\["`))
    }
  })

  it('field nodes use rectangle shape', () => {
    const fieldNodes = graph.nodes.filter(n => !n.isEnd)
    for (const node of fieldNodes.slice(0, 3)) {
      const id = node.id.replace(/-/g, '_')
      expect(mermaid).toMatch(new RegExp(`${id}\\["`))
    }
  })

  it('assigns end node class', () => {
    const endIds = graph.nodes.filter(n => n.isEnd).map(n => n.id.replace(/-/g, '_'))
    expect(mermaid).toContain(`class ${endIds.join(',')} endNode`)
  })

  it('assigns field node class', () => {
    const fieldIds = graph.nodes.filter(n => !n.isEnd).map(n => n.id.replace(/-/g, '_'))
    expect(mermaid).toContain(`class ${fieldIds.join(',')} fieldNode`)
  })

  it('conditional edges have labels', () => {
    const conditionalEdges = graph.edges.filter(e => e.edgeType === 'conditional')
    expect(conditionalEdges.length).toBeGreaterThan(0)
    for (const edge of conditionalEdges) {
      expect(edge.label).toBeTruthy()
    }
  })

  it('works with a minimal graph', () => {
    const g: FormGraph = {
      title: 'Test',
      nodes: [
        { id: 'a', ref: 'a', label: 'Q1', fieldType: 'short_text', isEnd: false },
        { id: 'b', ref: 'b', label: 'End', fieldType: 'thankyou_screen', isEnd: true },
      ],
      edges: [{ id: 'e0', from: 'a', to: 'b', label: '', edgeType: 'sequential' }],
    }
    const src = toMermaidSource(g)
    expect(src).toContain('flowchart TD')
    expect(src).toContain('a["Q1"]')
    expect(src).toContain('b(["End"])')
    expect(src).toContain('a --> b')
  })
})

// ─── 6. toMarkdownTable (unit) ───────────────────────────────────────────────

describe.runIf(testFilesExist)('toMarkdownTable', () => {
  let schema: TypeformSchema
  let table: string

  beforeAll(async () => {
    schema = await loadLocalSchema()
    table = toMarkdownTable(schema)
  })

  it('starts with the correct header', () => {
    const lines = table.split('\n')
    expect(lines[0]).toBe('| Label | Conditions | Answer Type |')
    expect(lines[1]).toBe('| --- | --- | --- |')
  })

  it('has a row for every field', () => {
    const lines = table.split('\n')
    const dataRows = lines.slice(2)
    expect(dataRows).toHaveLength(schema.fields.length)
  })

  it('every row starts and ends with a pipe', () => {
    const lines = table.split('\n')
    for (const line of lines) {
      expect(line.startsWith('|')).toBe(true)
      expect(line.endsWith('|')).toBe(true)
    }
  })

  it('contains known answer types', () => {
    expect(table).toContain('Email')
    expect(table).toContain('Short text')
    expect(table).toContain('Long text')
    expect(table).toContain('URL')
    expect(table).toContain('Date')
    expect(table).toContain('File upload')
    expect(table).toContain('Dropdown')
    expect(table).toContain('Checkbox')
  })

  it('contains single/multi select for multiple_choice fields', () => {
    expect(table).toMatch(/Single select|Multi select/)
  })

  it('maxChoices option truncates choice lists', () => {
    const truncated = toMarkdownTable(schema, { maxChoices: 2 })
    expect(truncated).toContain('(+')
    expect(truncated).toContain('more)')
  })

  it('conditional fields show conditions', () => {
    const lines = table.split('\n').slice(2)
    const withConditions = lines.filter(line => {
      const cells = line.split('|').map(c => c.trim())
      return cells[2] && cells[2].length > 0
    })
    expect(withConditions.length).toBeGreaterThan(0)
  })

  it('works with a minimal schema', () => {
    const minimal: TypeformSchema = {
      title: 'Test',
      fields: [
        { id: '1', ref: 'a', title: 'Name', type: 'short_text' },
        { id: '2', ref: 'b', title: 'Age', type: 'number' },
      ],
    }
    const md = toMarkdownTable(minimal)
    expect(md).toContain('Name')
    expect(md).toContain('Short text')
    expect(md).toContain('Number')
  })
})

// ─── 7. File-saving renderers ────────────────────────────────────────────────

describe.runIf(testFilesExist)('file-saving renderers', () => {
  let schema: TypeformSchema
  let graph: FormGraph
  const tempDir = join(tmpdir(), `typeform-test-${randomUUID()}`)

  beforeAll(async () => {
    schema = await loadLocalSchema()
    graph = buildGraph(schema)
    await mkdir(tempDir, { recursive: true })
  })

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('saveMermaidMd writes a valid markdown file', async () => {
    const out = join(tempDir, 'graph.md')
    await saveMermaidMd(graph, out)
    const content = await readFile(out, 'utf-8')
    expect(content).toContain('```mermaid')
    expect(content).toContain('flowchart TD')
    expect(content).toContain(`# ${graph.title}`)
  })

  it('saveMarkdownTable writes a valid markdown file', async () => {
    const out = join(tempDir, 'fields.md')
    await saveMarkdownTable(schema, out)
    const content = await readFile(out, 'utf-8')
    expect(content).toContain(`# ${schema.title}`)
    expect(content).toContain('| Label | Conditions | Answer Type |')
  })

  it('saveReactFlowHtml writes a valid HTML file', async () => {
    const out = join(tempDir, 'flow.html')
    await saveReactFlowHtml(graph, out)
    const content = await readFile(out, 'utf-8')
    expect(content).toContain('__GRAPH__')
    expect(content).toContain('@xyflow/react')
    expect(content).toContain('<!DOCTYPE html>')
    expect(content).toContain(graph.title)
  })

  it('saveReactFlowHtml respects direction option', async () => {
    const out = join(tempDir, 'flow-horiz.html')
    await saveReactFlowHtml(graph, out, { direction: 'horizontal' })
    const content = await readFile(out, 'utf-8')
    expect(content).toContain("'LR'")
  })

  it('saveReactFlowHtml respects maxRanksPerLine option', async () => {
    const out = join(tempDir, 'flow-wrapped.html')
    await saveReactFlowHtml(graph, out, { maxRanksPerLine: 5 })
    const content = await readFile(out, 'utf-8')
    expect(content).toContain('MAX_RANKS_PER_LINE = 5')
  })

  it('written files are non-empty', async () => {
    const files = ['graph.md', 'fields.md', 'flow.html']
    for (const file of files) {
      const info = await stat(join(tempDir, file))
      expect(info.size).toBeGreaterThan(0)
    }
  })
})

// ─── 8. getMermaidSvg (integration — Kroki API) ─────────────────────────────

describe('getMermaidSvg (Kroki API)', () => {
  it.runIf(testFilesExist)(
    'returns SVG content for a graph',
    async () => {
      if (!krokiAvailable) {
        console.warn('⚠ Kroki API is not reachable — skipping getMermaidSvg test')
        return
      }

      const minimal: FormGraph = {
        title: 'Test',
        nodes: [
          { id: 'a', ref: 'a', label: 'Start', fieldType: 'short_text', isEnd: false },
          { id: 'b', ref: 'b', label: 'End', fieldType: 'thankyou_screen', isEnd: true },
        ],
        edges: [{ id: 'e0', from: 'a', to: 'b', label: '', edgeType: 'sequential' }],
      }
      const svg = await getMermaidSvg(minimal)
      expect(svg).toContain('<svg')
    },
    60_000,
  )
})
