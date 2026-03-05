import {
  getTypeformSchema,
  getEmbeddedTypeformSchema,
  getMermaidSvg,
  type TypeformSchema,
  type FormGraph,
} from 'typeform-extractor'
import { isTypeformDomain } from './typeform'

export async function fetchFormFromUrl(url: string): Promise<TypeformSchema> {
  const [primary, fallback] = isTypeformDomain(url)
    ? [getTypeformSchema, getEmbeddedTypeformSchema]
    : [getEmbeddedTypeformSchema, getTypeformSchema]

  try {
    return await primary(url)
  } catch {
    return await fallback(url)
  }
}

export async function fetchMermaidSvg(graph: FormGraph): Promise<string> {
  return getMermaidSvg(graph)
}
