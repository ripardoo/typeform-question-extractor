# typeform-extractor

A library for fetching, parsing, and visualising Typeform schemas. Given a public Typeform URL, it extracts the form definition, builds a directed graph of questions and logic jumps, and can render that graph as a Mermaid flowchart, an interactive React Flow diagram, or a Markdown table.

## Install

```bash
npm install typeform-extractor
# or
pnpm add typeform-extractor
```

## Project structure

```
src/
├── index.ts              # public API (barrel export)
├── types.ts              # all TypeScript type definitions
├── extractor.ts          # HTML parsing & fetch logic
├── graph.ts              # form-schema → graph conversion
└── renderers/
    ├── index.ts           # renderer barrel export
    ├── markdown-table.ts  # Markdown table rendering
    ├── mermaid.ts         # Mermaid flowchart rendering
    └── react-flow.ts     # Interactive React Flow HTML rendering
```

## Library usage

```ts
import {
  getTypeformSchema,
  buildGraph,
  toMermaidSource,
  saveMermaidMd,
  saveMermaidSvg,
  saveReactFlowHtml,
  toMarkdownTable,
  saveMarkdownTable,
} from 'typeform-extractor'

const schema = await getTypeformSchema('https://example.typeform.com/to/XXXXX')
const graph = buildGraph(schema)

console.log(toMermaidSource(graph))
```
