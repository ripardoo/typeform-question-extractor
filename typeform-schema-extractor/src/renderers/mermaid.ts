import type { FormGraph, GraphEdge } from '../types.js'

function mid(ref: string): string {
  return ref.replace(/-/g, '_')
}

function mlabel(text: string): string {
  return text
    .replace(/"/g, '#quot;')
    .replace(/\[/g, '#lsqb;')
    .replace(/\]/g, '#rsqb;')
    .replace(/</g, '#lt;')
    .replace(/>/g, '#gt;')
    .replace(/\(/g, '#lpar;')
    .replace(/\)/g, '#rpar;')
}

function edgeArrow(edge: GraphEdge): string {
  const from = mid(edge.from)
  const to = mid(edge.to)
  if (!edge.label) return `  ${from} --> ${to}`
  return `  ${from} -- "${mlabel(edge.label)}" --> ${to}`
}

export function toMermaidSource(graph: FormGraph): string {
  const lines: string[] = ['flowchart TD']

  for (const node of graph.nodes) {
    const id = mid(node.id)
    const label = mlabel(node.label)
    if (node.isEnd) {
      lines.push(`  ${id}(["${label}"])`)
    } else {
      lines.push(`  ${id}["${label}"]`)
    }
  }

  lines.push('')

  for (const edge of graph.edges) {
    lines.push(edgeArrow(edge))
  }

  lines.push('')
  lines.push('  classDef endNode fill:#4fb8b2,stroke:#328f97,color:#fff,font-weight:600')
  lines.push('  classDef fieldNode fill:#ffffff,stroke:#e2e8f0,color:#1e293b')
  lines.push('')

  const endIds = graph.nodes.filter(n => n.isEnd).map(n => mid(n.id))
  const fieldIds = graph.nodes.filter(n => !n.isEnd).map(n => mid(n.id))

  if (endIds.length) lines.push(`  class ${endIds.join(',')} endNode`)
  if (fieldIds.length) lines.push(`  class ${fieldIds.join(',')} fieldNode`)

  return lines.join('\n')
}

export async function saveMermaidMd(graph: FormGraph, outputPath: string): Promise<void> {
  const { writeFile } = await import('node:fs/promises')
  const source = toMermaidSource(graph)
  const md = `# ${graph.title}\n\n\`\`\`mermaid\n${source}\n\`\`\`\n`
  await writeFile(outputPath, md)
  console.log(`✓  Mermaid MD  → ${outputPath}`)
}

export async function getMermaidSvg(graph: FormGraph): Promise<string> {
  const source = toMermaidSource(graph)
  const response = await fetch('https://kroki.io/mermaid/svg', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: source,
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Kroki API error ${response.status}: ${body}`)
  }
  return response.text()
}

export async function saveMermaidSvg(graph: FormGraph, outputPath: string): Promise<void> {
  const { writeFile } = await import('node:fs/promises')
  const svg = await getMermaidSvg(graph)
  await writeFile(outputPath, svg)
  console.log(`✓  Mermaid SVG → ${outputPath}`)
}
