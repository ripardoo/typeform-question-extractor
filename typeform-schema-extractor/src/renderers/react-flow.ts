import type { FormGraph } from '../types.js'

/** Options for React Flow HTML export (e.g. saveReactFlowHtml). */
export interface ReactFlowExportOptions {
  /** Layout direction of the graph. Default: `'vertical'` (top-to-bottom). Use `'horizontal'` for left-to-right. */
  direction?: 'vertical' | 'horizontal'
  /**
   * When set, wrap the flow into multiple columns (vertical) or rows (horizontal).
   * Each "line" contains at most this many ranks (flow levels). Example: `5` puts ranks 0–4 in the first column, 5–9 in the second, etc.
   * Omit or set to 0 for a single continuous flow.
   */
  maxRanksPerLine?: number
  /** Gap in pixels between wrapped lines (columns or rows). Used only when `maxRanksPerLine` is set. Default: 120. */
  lineGap?: number
}

const NODE_W = 230
const NODE_H = 72

const EDGE_COLORS: Record<string, string> = {
  sequential: '#94a3b8',
  conditional: '#f97316',
  default: '#22c55e',
}

const DEFAULT_LINE_GAP = 120

function buildHtml(graph: FormGraph, options?: ReactFlowExportOptions): string {
  const direction = options?.direction ?? 'vertical'
  const rankdir = direction === 'horizontal' ? 'LR' : 'TB'
  const targetPosition = direction === 'horizontal' ? 'Position.Left' : 'Position.Top'
  const sourcePosition = direction === 'horizontal' ? 'Position.Right' : 'Position.Bottom'
  const maxRanksPerLine = options?.maxRanksPerLine ?? 0
  const lineGap = options?.lineGap ?? DEFAULT_LINE_GAP

  const graphJson = JSON.stringify(graph)

  const appScript = /* js */ `
    import React, { useCallback } from 'react'
    import { createRoot } from 'react-dom/client'
    import {
      ReactFlow,
      Background,
      Controls,
      MiniMap,
      Panel,
      Handle,
      Position,
      useNodesState,
      useEdgesState,
      MarkerType,
    } from '@xyflow/react'
    import dagre from '@dagrejs/dagre'

    const graph = window.__GRAPH__
    const NODE_W = ${NODE_W}
    const NODE_H = ${NODE_H}
    const RANKDIR = '${rankdir}'
    const TARGET_POS = ${targetPosition}
    const SOURCE_POS = ${sourcePosition}
    const MAX_RANKS_PER_LINE = ${maxRanksPerLine}
    const LINE_GAP = ${lineGap}

    const EDGE_COLORS = ${JSON.stringify(EDGE_COLORS)}

    // Compute rank (flow level) per node: 0 = roots, then 1 + max(predecessor ranks)
    function getRankMap(nodes, edges) {
      const idToRank = {}
      const inEdges = {}
      nodes.forEach(n => { inEdges[n.id] = [] })
      edges.forEach(e => { inEdges[e.target] = inEdges[e.target] || []; inEdges[e.target].push(e.source) })
      const visit = (id) => {
        if (idToRank[id] != null) return idToRank[id]
        const preds = inEdges[id] || []
        const r = preds.length === 0 ? 0 : 1 + Math.max(...preds.map(visit))
        idToRank[id] = r
        return r
      }
      nodes.forEach(n => visit(n.id))
      return idToRank
    }

    // ─── Dagre layout ────────────────────────────────────────────────────
    function applyDagreLayout(nodes, edges) {
      const g = new dagre.graphlib.Graph()
      g.setDefaultEdgeLabel(() => ({}))
      g.setGraph({ rankdir: RANKDIR, ranksep: 90, nodesep: 50, marginx: 30, marginy: 30 })

      nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
      edges.forEach(e => g.setEdge(e.source, e.target))

      dagre.layout(g)

      let result = nodes.map(n => {
        const pos = g.node(n.id)
        return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } }
      })

      if (MAX_RANKS_PER_LINE > 0) {
        const rankMap = getRankMap(nodes, edges)
        const isVertical = RANKDIR === 'TB'
        const lineIndex = (n) => Math.floor((rankMap[n.id] ?? 0) / MAX_RANKS_PER_LINE)
        const lines = new Map()
        result.forEach(n => {
          const li = lineIndex(n)
          if (!lines.has(li)) lines.set(li, [])
          lines.get(li).push(n)
        })
        const lineIndices = [...lines.keys()].sort((a, b) => a - b)
        const bbox = (list) => {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
          list.forEach(n => {
            const { x, y } = n.position
            minX = Math.min(minX, x); maxX = Math.max(maxX, x + NODE_W)
            minY = Math.min(minY, y); maxY = Math.max(maxY, y + NODE_H)
          })
          return { w: maxX - minX, h: maxY - minY }
        }
        const offsets = {}
        const lineMinX = {}
        let acc = 0
        lineIndices.forEach(li => {
          offsets[li] = acc
          const list = lines.get(li)
          lineMinX[li] = Math.min(...list.map(node => node.position.x))
          const { w, h } = bbox(list)
          acc += (isVertical ? w : h) + LINE_GAP
        })
        result = result.map(n => {
          const li = lineIndex(n)
          const off = offsets[li] ?? 0
          const pos = n.position
          if (isVertical) return { ...n, position: { x: pos.x + off, y: pos.y } }
          // Horizontal: rebase each row so it starts at x=0 (left side)
          return { ...n, position: { x: pos.x - lineMinX[li], y: pos.y + off } }
        })
      }

      return result
    }

    // ─── Custom node ─────────────────────────────────────────────────────
    const ce = React.createElement

    const FieldNode = ({ data }) => {
      const isEnd = data.isEnd
      return ce('div', {
        style: {
          width: NODE_W,
          minHeight: NODE_H,
          background: isEnd ? '#4fb8b2' : '#ffffff',
          border: \`2px solid \${isEnd ? '#328f97' : '#e2e8f0'}\`,
          borderRadius: 10,
          padding: '8px 12px 8px 12px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          position: 'relative',
        },
      },
        ce(Handle, { type: 'target', position: TARGET_POS, style: { background: '#94a3b8' } }),
        ce('div', {
          style: {
            fontSize: 10,
            fontWeight: 600,
            color: isEnd ? 'rgba(255,255,255,0.72)' : '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 4,
          },
        }, data.fieldType.replace(/_/g, ' ')),
        ce('div', {
          style: {
            fontSize: 12,
            fontWeight: 600,
            color: isEnd ? '#ffffff' : '#1e293b',
            lineHeight: 1.4,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          },
        }, data.label),
        !isEnd && ce(Handle, { type: 'source', position: SOURCE_POS, style: { background: '#94a3b8' } }),
      )
    }

    const nodeTypes = { fieldNode: FieldNode }

    // ─── Build initial React Flow nodes ──────────────────────────────────
    const rfNodes = graph.nodes.map(node => ({
      id: node.id,
      type: 'fieldNode',
      position: { x: 0, y: 0 },
      data: { label: node.label, fieldType: node.fieldType, isEnd: node.isEnd },
    }))

    const rfEdges = graph.edges.map(edge => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      label: edge.label || undefined,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLORS[edge.edgeType] ?? '#94a3b8' },
      style: { stroke: EDGE_COLORS[edge.edgeType] ?? '#94a3b8', strokeWidth: 2 },
      labelStyle: { fontSize: 11, fontWeight: 600, fill: '#334155' },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.92 },
      labelBgPadding: [4, 6],
      labelBgBorderRadius: 4,
    }))

    const layoutedNodes = applyDagreLayout(rfNodes, rfEdges)

    // ─── Legend item ─────────────────────────────────────────────────────
    const LegendItem = ({ color, label }) =>
      ce('div', { style: { display: 'flex', alignItems: 'center', gap: 7 } },
        ce('div', { style: { width: 22, height: 3, background: color, borderRadius: 2, flexShrink: 0 } }),
        ce('span', null, label),
      )

    // ─── App ─────────────────────────────────────────────────────────────
    function App() {
      const [nodes, , onNodesChange] = useNodesState(layoutedNodes)
      const [edges, , onEdgesChange] = useEdgesState(rfEdges)

      return ce('div', { style: { width: '100vw', height: '100vh' } },
        ce(ReactFlow, {
          nodes,
          edges,
          onNodesChange,
          onEdgesChange,
          nodeTypes,
          fitView: true,
          fitViewOptions: { padding: 0.18 },
          minZoom: 0.05,
          maxZoom: 2,
          attributionPosition: 'bottom-right',
        },
          ce(Background, { gap: 20, color: '#e2e8f0', variant: 'dots' }),
          ce(Controls),
          ce(MiniMap, {
            nodeColor: n => n.data?.isEnd ? '#4fb8b2' : '#ffffff',
            maskColor: 'rgba(241,245,249,0.75)',
            style: { border: '1px solid #e2e8f0', borderRadius: 8 },
          }),
          ce(Panel, { position: 'top-left' },
            ce('div', {
              style: {
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '12px 16px',
                boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
                maxWidth: 280,
              },
            },
              ce('h2', {
                style: { fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0', lineHeight: 1.3 },
              }, graph.title),
              ce('div', { style: { fontSize: 11, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 6 } },
                ce(LegendItem, { color: '#94a3b8', label: 'Sequential (no logic)' }),
                ce(LegendItem, { color: '#f97316', label: 'Conditional jump' }),
                ce(LegendItem, { color: '#22c55e', label: 'Default / always' }),
              ),
              ce('div', {
                style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8' },
              }, \`\${graph.nodes.length} nodes · \${graph.edges.length} edges\`),
            ),
          ),
        ),
      )
    }

    createRoot(document.getElementById('root')).render(ce(App))
    `

  return /* html */ `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${graph.title} — Flow Graph</title>
      <link rel="stylesheet" href="https://esm.sh/@xyflow/react@12/dist/style.css" />
      <style>
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; }
        #root { width: 100vw; height: 100vh; }
        /* Ensure React Flow edge labels look clean */
        .react-flow__edge-textbg { rx: 4; ry: 4; }
      </style>
    </head>
    <body>
      <div id="root"></div>

      <script>window.__GRAPH__ = ${graphJson};</script>

      <script type="importmap">
      {
        "imports": {
          "react":              "https://esm.sh/react@19",
          "react/jsx-runtime":  "https://esm.sh/react@19/jsx-runtime",
          "react-dom":          "https://esm.sh/react-dom@19",
          "react-dom/client":   "https://esm.sh/react-dom@19/client",
          "@xyflow/react":      "https://esm.sh/@xyflow/react@12?deps=react@19,react-dom@19",
          "@dagrejs/dagre":     "https://esm.sh/@dagrejs/dagre"
        }
      }
      </script>

      <script type="module">
    ${appScript}
      </script>
    </body>
    </html>`
}

export async function saveReactFlowHtml(
  graph: FormGraph,
  outputPath: string,
  options?: ReactFlowExportOptions,
): Promise<void> {
  const html = buildHtml(graph, options)
  const { writeFile } = await import('node:fs/promises')
  await writeFile(outputPath, html)
  console.log(`✓  React Flow  → ${outputPath}`)
}
