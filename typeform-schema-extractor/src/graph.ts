import type {
  TypeformSchema,
  TypeformField,
  LogicCondition,
  LogicConditionVar,
  FormGraph,
  GraphNode,
  GraphEdge,
  EdgeType,
} from './types.js'

function truncate(text: string, maxLen = 65): string {
  const cleaned = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen - 1) + '…' : cleaned
}

function isConditionVar(v: LogicConditionVar | LogicCondition): v is LogicConditionVar {
  return 'type' in v && !('op' in v)
}

function describeCondition(
  condition: LogicCondition,
  fieldsMap: Map<string, TypeformField>,
): string {
  if (condition.op === 'always') return 'default'

  const vars = condition.vars ?? []

  if (condition.op === 'is' && vars.length >= 2
    && isConditionVar(vars[0]!) && (vars[0] as LogicConditionVar).type === 'field'
    && isConditionVar(vars[1]!) && (vars[1] as LogicConditionVar).type === 'choice') {
    const fieldRef = String((vars[0] as LogicConditionVar).value)
    const choiceRef = String((vars[1] as LogicConditionVar).value)
    const field = fieldsMap.get(fieldRef)
    const choice = field?.properties?.choices?.find(c => c.ref === choiceRef)
    return choice?.label ?? choiceRef.slice(0, 8)
  }

  if (condition.op === 'and' || condition.op === 'or') {
    const sep = condition.op === 'and' ? ' & ' : ' | '
    return vars
      .filter((v): v is LogicCondition => 'op' in v)
      .map(v => describeCondition(v, fieldsMap)).join(sep)
  }

  if (vars.length >= 2 && isConditionVar(vars[0]!) && isConditionVar(vars[1]!)) {
    const lhs = vars[0] as LogicConditionVar
    const rhs = vars[1] as LogicConditionVar
    const lhsLabel = lhs.type === 'variable' ? lhs.value : lhs.type === 'field'
      ? (fieldsMap.get(String(lhs.value))?.title ?? lhs.value) : lhs.value
    return `${lhsLabel} ${condition.op} ${rhs.value}`
  }

  return condition.op
}

export function buildGraph(form: TypeformSchema): FormGraph {
  if (!form || typeof form !== 'object') {
    throw new Error('Invalid form schema: expected a form object but received nothing.')
  }
  if (!Array.isArray(form.fields) || form.fields.length === 0) {
    throw new Error('Invalid form schema: the form has no fields. Is this a valid Typeform URL?')
  }

  const fieldsMap = new Map<string, TypeformField>(form.fields.map(f => [f.ref, f]))

  const nodes: GraphNode[] = form.fields.map(f => ({
    id: f.ref,
    ref: f.ref,
    label: truncate(f.title),
    fieldType: f.type,
    isEnd: false,
  }))

  const thankyouScreens = form.thankyou_screens ?? []
  for (const screen of thankyouScreens) {
    nodes.push({
      id: screen.ref,
      ref: screen.ref,
      label: truncate(screen.title),
      fieldType: 'thankyou_screen',
      isEnd: true,
    })
  }

  const fieldsWithLogic = new Set(
    (form.logic ?? [])
      .filter(l => l.actions.some(a => a.action === 'jump' && a.details.to))
      .map(l => l.ref),
  )

  const edges: GraphEdge[] = []
  let counter = 0

  for (const [i, field] of form.fields.entries()) {
    if (fieldsWithLogic.has(field.ref)) continue

    const next = form.fields[i + 1]
    if (next) {
      edges.push({ id: `e${counter++}`, from: field.ref, to: next.ref, label: '', edgeType: 'sequential' })
    } else {
      const defaultTys =
        thankyouScreens.find(s => s.ref === 'default_tys') ?? thankyouScreens[0]
      if (defaultTys) {
        edges.push({ id: `e${counter++}`, from: field.ref, to: defaultTys.ref, label: '', edgeType: 'sequential' })
      }
    }
  }

  for (const entry of form.logic ?? []) {
    for (const action of entry.actions) {
      if (action.action !== 'jump' || !action.details.to) continue
      const label = describeCondition(action.condition as LogicCondition, fieldsMap)
      const toRef = action.details.to.value
      const edgeType: EdgeType = action.condition.op === 'always' ? 'default' : 'conditional'
      edges.push({ id: `e${counter++}`, from: entry.ref, to: toRef, label, edgeType })
    }
  }

  return { title: form.title, nodes, edges }
}
