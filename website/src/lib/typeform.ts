import { createServerFn } from '@tanstack/react-start'
import type { TypeformSchema, FormGraph } from 'typeform-extractor'

function isValidUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

export function isTypeformDomain(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname === 'typeform.com' || hostname.endsWith('.typeform.com')
  } catch {
    return false
  }
}

export const getFormFromUrl = createServerFn({ method: 'POST' })
  .inputValidator((data: { url: string }) => {
    const url = typeof data?.url === 'string' ? data.url.trim() : ''
    if (!url) throw new Error('URL is required')
    if (!isValidUrl(url)) {
      throw new Error('Please enter a valid HTTPS URL')
    }
    return { url }
  })
  .handler(async ({ data }): Promise<TypeformSchema> => {
    const { fetchFormFromUrl } = await import('./typeform.server')
    return fetchFormFromUrl(data.url)
  })

export const getMermaidSvgFromGraph = createServerFn({ method: 'POST' })
  .inputValidator((data: { graph: FormGraph }) => {
    if (!data?.graph || !Array.isArray(data.graph.nodes) || !Array.isArray(data.graph.edges)) {
      throw new Error('Invalid graph data')
    }
    return { graph: data.graph as FormGraph }
  })
  .handler(async ({ data }): Promise<string> => {
    const { fetchMermaidSvg } = await import('./typeform.server')
    return fetchMermaidSvg(data.graph)
  })
