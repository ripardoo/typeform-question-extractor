'use client'

import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  type NodeProps,
  type Node,
  type Edge,
} from '@xyflow/react'
import dagre from '@dagrejs/dagre'
import type { FormGraph } from 'typeform-extractor'

import '@xyflow/react/dist/style.css'

const NODE_W = 230
const NODE_H = 72

const EDGE_COLORS: Record<string, string> = {
  sequential: '#94a3b8',
  conditional: '#f97316',
  default: '#22c55e',
}

type FieldNodeData = {
  label: string
  fieldType: string
  isEnd: boolean
}

type FieldNodeType = Node<FieldNodeData, 'fieldNode'>

const DEFAULT_LINE_GAP = 120
/** Default max ranks per row (horizontal) or per column (vertical) so most graphs fit the viewport. */
const DEFAULT_MAX_RANKS_PER_LINE = 10

function getRankMap(nodes: FieldNodeType[], edges: Edge[]): Record<string, number> {
  const idToRank: Record<string, number> = {}
  const inEdges: Record<string, string[]> = {}
  nodes.forEach((n) => {
    inEdges[n.id] = []
  })
  edges.forEach((e) => {
    inEdges[e.target] = inEdges[e.target] ?? []
    inEdges[e.target].push(e.source)
  })
  const visit = (id: string): number => {
    if (idToRank[id] != null) return idToRank[id]
    const preds = inEdges[id] ?? []
    const r = preds.length === 0 ? 0 : 1 + Math.max(...preds.map(visit))
    idToRank[id] = r
    return r
  }
  nodes.forEach((n) => visit(n.id))
  return idToRank
}

function applyDagreLayout(
  nodes: FieldNodeType[],
  edges: Edge[],
  direction: 'vertical' | 'horizontal',
  maxRanksPerLine: number,
  lineGap: number,
): FieldNodeType[] {
  const rankdir = direction === 'horizontal' ? 'LR' : 'TB'
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir, ranksep: 90, nodesep: 50, marginx: 30, marginy: 30 })

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
  edges.forEach((e) => g.setEdge(e.source, e.target))

  dagre.layout(g)

  let result: FieldNodeType[] = nodes.map((n) => {
    const pos = g.node(n.id)
    return {
      ...n,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
    }
  })

  if (maxRanksPerLine > 0) {
    const rankMap = getRankMap(nodes, edges)
    const isVertical = rankdir === 'TB'
    const lineIndex = (n: FieldNodeType) =>
      Math.floor((rankMap[n.id] ?? 0) / maxRanksPerLine)
    const lines = new Map<number, FieldNodeType[]>()
    result.forEach((n) => {
      const li = lineIndex(n)
      if (!lines.has(li)) lines.set(li, [])
      lines.get(li)!.push(n)
    })
    const lineIndices = [...lines.keys()].sort((a, b) => a - b)
    const bbox = (list: FieldNodeType[]) => {
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity
      list.forEach((n) => {
        const { x, y } = n.position
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x + NODE_W)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y + NODE_H)
      })
      return { w: maxX - minX, h: maxY - minY }
    }
    const offsets: Record<number, number> = {}
    const lineMinX: Record<number, number> = {}
    let acc = 0
    lineIndices.forEach((li) => {
      offsets[li] = acc
      const list = lines.get(li)!
      lineMinX[li] = Math.min(...list.map((node) => node.position.x))
      const { w, h } = bbox(list)
      acc += (isVertical ? w : h) + lineGap
    })
    result = result.map((n) => {
      const li = lineIndex(n)
      const off = offsets[li] ?? 0
      const pos = n.position
      if (isVertical) {
        return { ...n, position: { x: pos.x + off, y: pos.y } }
      }
      // Horizontal: rebase each row so it starts at x=0 (left side)
      return {
        ...n,
        position: { x: pos.x - lineMinX[li]!, y: pos.y + off },
      }
    })
  }

  return result
}

function createFieldNode(
  targetPos: (typeof Position)[keyof typeof Position],
  sourcePos: (typeof Position)[keyof typeof Position],
) {
  return function FieldNode({ data }: NodeProps<FieldNodeType>) {
    const isEnd = data.isEnd
    return (
      <div
        style={{
          width: NODE_W,
          minHeight: NODE_H,
          background: isEnd ? 'var(--lagoon)' : 'var(--surface-strong)',
          border: `2px solid ${isEnd ? 'var(--lagoon-deep)' : 'var(--line)'}`,
          borderRadius: 10,
          padding: '8px 12px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          position: 'relative',
        }}
      >
        <Handle type="target" position={targetPos} style={{ background: 'var(--sea-ink-soft)' }} />
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: isEnd ? 'rgba(255,255,255,0.72)' : 'var(--sea-ink-soft)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 4,
          }}
        >
          {data.fieldType.replace(/_/g, ' ')}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: isEnd ? '#ffffff' : 'var(--sea-ink)',
            lineHeight: 1.4,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
          }}
        >
          {data.label}
        </div>
        {!isEnd && (
          <Handle type="source" position={sourcePos} style={{ background: 'var(--sea-ink-soft)' }} />
        )}
      </div>
    )
  }
}

const FieldNodeVertical = createFieldNode(Position.Top, Position.Bottom)
const FieldNodeHorizontal = createFieldNode(Position.Left, Position.Right)

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        style={{
          width: 22,
          height: 3,
          background: color,
          borderRadius: 2,
          flexShrink: 0,
        }}
      />
      <span className="text-xs text-[var(--sea-ink-soft)]">{label}</span>
    </div>
  )
}

interface FormGraphViewerProps {
  graph: FormGraph
  className?: string
  /** Layout direction. Default: `'horizontal'` so most graphs fit the viewport. */
  direction?: 'vertical' | 'horizontal'
  /** Max ranks per row (horizontal) or per column (vertical); wrap into multiple rows/cols when set. Default: 10. */
  maxRanksPerLine?: number
  /** Gap in px between wrapped lines. Default: 120. */
  lineGap?: number
}

export default function FormGraphViewer({
  graph,
  className = '',
  direction = 'horizontal',
  maxRanksPerLine = DEFAULT_MAX_RANKS_PER_LINE,
  lineGap = DEFAULT_LINE_GAP,
}: FormGraphViewerProps) {
  const nodeTypes = useMemo(
    () => ({
      fieldNode: direction === 'horizontal' ? FieldNodeHorizontal : FieldNodeVertical,
    }),
    [direction],
  )

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: FieldNodeType[] = graph.nodes.map((node) => ({
      id: node.id,
      type: 'fieldNode' as const,
      position: { x: 0, y: 0 },
      data: {
        label: node.label,
        fieldType: node.fieldType,
        isEnd: node.isEnd,
      },
    }))

    const edges: Edge[] = graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      label: edge.label || undefined,
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: EDGE_COLORS[edge.edgeType] ?? '#94a3b8',
      },
      style: {
        stroke: EDGE_COLORS[edge.edgeType] ?? '#94a3b8',
        strokeWidth: 2,
      },
      labelStyle: { fontSize: 11, fontWeight: 600, fill: 'var(--sea-ink)' },
      labelBgStyle: { fill: 'var(--surface-strong)', fillOpacity: 0.92 },
      labelBgPadding: [4, 6] as [number, number],
      labelBgBorderRadius: 4,
    }))

    const layoutedNodes = applyDagreLayout(
      nodes,
      edges,
      direction,
      maxRanksPerLine,
      lineGap,
    )
    return { initialNodes: layoutedNodes, initialEdges: edges }
  }, [graph, direction, maxRanksPerLine, lineGap])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className={className} style={{ minHeight: 400 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.05}
        maxZoom={2}
        attributionPosition="bottom-right"
      >
        <Background gap={20} color="var(--line)" variant={BackgroundVariant.Dots} />
        <Controls />
        <MiniMap
          nodeColor={(n) => (n.data?.isEnd ? 'var(--lagoon)' : 'var(--surface-strong)')}
          maskColor="var(--surface)"
          style={{ border: '1px solid var(--line)', borderRadius: 8 }}
        />
        <Panel position="top-left">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 shadow-sm max-w-[280px]">
            <h2 className="mb-2.5 text-sm font-bold leading-tight text-[var(--sea-ink)]">
              {graph.title}
            </h2>
            <div className="flex flex-col gap-1.5 text-[11px] text-[var(--sea-ink-soft)]">
              <LegendItem color="#94a3b8" label="Sequential (no logic)" />
              <LegendItem color="#f97316" label="Conditional jump" />
              <LegendItem color="#22c55e" label="Default / always" />
            </div>
            <div className="mt-2.5 border-t border-[var(--line)] pt-2.5 text-[11px] text-[var(--sea-ink-soft)]">
              {graph.nodes.length} nodes · {graph.edges.length} edges
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
