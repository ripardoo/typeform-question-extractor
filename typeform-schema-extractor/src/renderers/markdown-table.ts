import type { TypeformSchema, TypeformField, LogicCondition, LogicConditionVar } from '../types.js'

/** Escape pipe so table cell boundaries are preserved. */
function escapePipe(text: string): string {
  return text.replace(/\|/g, '\\|')
}

/** For table cells: escape pipe and turn newlines into <br> so markdown renderers show line breaks. */
function cellText(text: string): string {
  return escapePipe(text.replace(/\n/g, '<br>')).trim()
}

/** For condition strings: escape pipe and collapse newlines to space (used inside describeCondition). */
function escPipe(text: string): string {
  return escapePipe(text.replace(/\n/g, ' ')).trim()
}

function truncateLabel(text: string, maxLen = 50): string {
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
  if (condition.op === 'always') return ''

  const vars = condition.vars ?? []

  if (condition.op === 'is' && vars.length >= 2
    && isConditionVar(vars[0]!) && (vars[0] as LogicConditionVar).type === 'field'
    && isConditionVar(vars[1]!) && (vars[1] as LogicConditionVar).type === 'choice') {
    const fieldRef = String((vars[0] as LogicConditionVar).value)
    const choiceRef = String((vars[1] as LogicConditionVar).value)
    const field = fieldsMap.get(fieldRef)
    const fieldTitle = field ? truncateLabel(field.title) : fieldRef.slice(0, 8)
    const choice = field?.properties?.choices?.find(c => c.ref === choiceRef)
    const choiceLabel = choice?.label ?? choiceRef.slice(0, 8)
    return `"${fieldTitle}" = "${choiceLabel}"`
  }

  if (condition.op === 'and' || condition.op === 'or') {
    const sep = condition.op === 'and' ? ' AND ' : ' OR '
    return vars
      .filter((v): v is LogicCondition => 'op' in v)
      .map(v => describeCondition(v, fieldsMap)).join(sep)
  }

  if (vars.length >= 2 && isConditionVar(vars[0]!) && isConditionVar(vars[1]!)) {
    const lhs = vars[0] as LogicConditionVar
    const rhs = vars[1] as LogicConditionVar
    const lhsLabel = lhs.type === 'variable' ? lhs.value : lhs.type === 'field'
      ? truncateLabel(fieldsMap.get(String(lhs.value))?.title ?? String(lhs.value)) : lhs.value
    return `"${lhsLabel}" ${condition.op} ${rhs.value}`
  }

  return condition.op
}

const DEFAULT_MAX_CHOICES = 8

/** Escape a choice label for use inside HTML/markdown (pipe + newlines → <br>). */
function escapeChoiceLabel(label: string): string {
  return escapePipe(label.replace(/\n/g, '<br>')).trim()
}

/** Format choice list so each option is on its own line with a bullet (markdown-friendly). */
function formatChoices(labels: string[], prefix: string, maxChoices: number): string {
  if (!labels.length) return prefix
  const escaped = labels.map(escapeChoiceLabel)
  const bullet = ' <br>• '
  if (labels.length <= maxChoices) {
    return `${prefix}:${bullet}${escaped.join(bullet)}`
  }
  const shown = escaped.slice(0, maxChoices)
  return `${prefix}:${bullet}${shown.join(bullet)}${bullet}… (+${labels.length - maxChoices} more)`
}

function describeAnswerType(field: TypeformField, maxChoices: number): string {
  const choices = field.properties?.choices
  const allowOther = field.properties?.allow_other_choice === true
  const otherLabels = allowOther ? ['Other'] : []

  switch (field.type) {
    case 'email':
      return 'Email'
    case 'website':
      return 'URL'
    case 'short_text':
      return 'Short text'
    case 'long_text':
      return 'Long text'
    case 'date':
      return 'Date'
    case 'file_upload':
      return 'File upload'
    case 'number':
      return 'Number'
    case 'phone_number':
      return 'Phone number'
    case 'yes_no':
      return 'Yes / No'
    case 'rating':
      return 'Rating'
    case 'opinion_scale':
      return 'Opinion scale'
    case 'legal':
      return 'Legal'
    case 'multiple_choice': {
      const labels = [...(choices?.map(c => c.label) ?? []), ...otherLabels]
      const multi = field.properties?.allow_multiple_selection === true
      return formatChoices(labels, multi ? 'Multi select' : 'Single select', maxChoices)
    }
    case 'dropdown': {
      const labels = choices?.map(c => c.label) ?? []
      return formatChoices(labels, 'Dropdown', maxChoices)
    }
    case 'checkbox': {
      const labels = choices?.map(c => c.label) ?? []
      return formatChoices(labels, 'Checkbox', maxChoices)
    }
    default:
      return field.type
  }
}

// ─── Reachability analysis ───────────────────────────────────────────────────
//
// Walk through fields in order, propagating how each field can be reached:
//   • unconditional – reachable via sequential flow or an `always` jump
//   • conditions[]  – reachable only when one of these conditions is true
//
// When rendering, a field is "conditional" only if it has conditions but is
// NOT also unconditionally reachable.

interface FieldReachability {
  unconditional: boolean
  conditions: string[]
}

export interface MarkdownTableOptions {
  /** Max choices to list before truncating with "… (+N more)". Defaults to 8. */
  maxChoices?: number
}

export function toMarkdownTable(form: TypeformSchema, options?: MarkdownTableOptions): string {
  const maxChoices = options?.maxChoices ?? DEFAULT_MAX_CHOICES
  const fieldsMap = new Map(form.fields.map(f => [f.ref, f]))
  const logicMap = new Map((form.logic ?? []).map(l => [l.ref, l]))
  const reachability = new Map<string, FieldReachability>()

  const getOrCreate = (ref: string): FieldReachability => {
    let info = reachability.get(ref)
    if (!info) {
      info = { unconditional: false, conditions: [] }
      reachability.set(ref, info)
    }
    return info
  }

  if (form.fields.length > 0) {
    getOrCreate(form.fields[0]!.ref).unconditional = true
  }

  for (let i = 0; i < form.fields.length; i++) {
    const field = form.fields[i]!
    const thisInfo = getOrCreate(field.ref)
    const logic = logicMap.get(field.ref)
    const nextField = form.fields[i + 1]

    const jumpActions = logic?.actions.filter(a => a.action === 'jump' && a.details.to)
    if (jumpActions && jumpActions.length > 0) {
      for (const action of jumpActions) {
        const targetRef = action.details.to!.value
        const targetInfo = getOrCreate(targetRef)

        if (action.condition.op === 'always') {
          targetInfo.unconditional = true
        } else {
          const condDesc = describeCondition(action.condition, fieldsMap)
          if (condDesc && !targetInfo.conditions.includes(condDesc)) {
            targetInfo.conditions.push(condDesc)
          }
        }
      }
    } else if (nextField) {
      const nextInfo = getOrCreate(nextField.ref)
      if (thisInfo.unconditional) {
        nextInfo.unconditional = true
      } else if (thisInfo.conditions.length > 0) {
        for (const cond of thisInfo.conditions) {
          if (!nextInfo.conditions.includes(cond)) {
            nextInfo.conditions.push(cond)
          }
        }
      }
    }
  }

  const rows: string[] = []
  rows.push('| Label | Conditions | Answer Type |')
  rows.push('| --- | --- | --- |')

  for (const field of form.fields) {
    const label = cellText(field.title)
    const info = reachability.get(field.ref)
    const condition =
      info && !info.unconditional && info.conditions.length > 0
        ? info.conditions.map(escPipe).join(' <br>OR ')
        : ''
    const answerType = describeAnswerType(field, maxChoices)

    rows.push(`| ${label} | ${condition} | ${answerType} |`)
  }

  return rows.join('\n')
}

export async function saveMarkdownTable(
  form: TypeformSchema,
  outputPath: string,
  options?: MarkdownTableOptions,
): Promise<void> {
  const table = toMarkdownTable(form, options)
  const md = `# ${form.title}\n\n${table}\n`
  const { writeFile } = await import('node:fs/promises')
  await writeFile(outputPath, md)
  console.log(`✓  MD table    → ${outputPath}`)
}
