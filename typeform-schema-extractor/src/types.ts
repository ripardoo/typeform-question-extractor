// ─── Typeform raw schema types ───────────────────────────────────────────────

export interface TypeformChoice {
  id: string
  ref: string
  label: string
}

export interface TypeformField {
  id: string
  ref: string
  title: string
  type: string
  properties?: {
    choices?: TypeformChoice[]
    [key: string]: {} | undefined
  }
}

export interface TypeformThankyouScreen {
  id: string
  ref: string
  title: string
  type: string
}

export interface LogicConditionVar { type: string; value: string | number }

export interface LogicCondition {
  op: string
  vars: Array<LogicConditionVar | LogicCondition>
}

export interface LogicAction {
  action: string
  details: {
    to?: { type: string; value: string }
    target?: { type: string; value: string }
    value?: { type: string; value: string | number }
  }
  condition: LogicCondition
}

export interface LogicEntry {
  type: 'field'
  ref: string
  actions: LogicAction[]
}

export interface TypeformSchema {
  title: string
  fields: TypeformField[]
  logic?: LogicEntry[]
  thankyou_screens?: TypeformThankyouScreen[]
}

// ─── Graph types ──────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string
  ref: string
  label: string
  fieldType: string
  isEnd: boolean
}

export type EdgeType = 'sequential' | 'conditional' | 'default'

export interface GraphEdge {
  id: string
  from: string
  to: string
  label: string
  edgeType: EdgeType
}

export interface FormGraph {
  title: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}
