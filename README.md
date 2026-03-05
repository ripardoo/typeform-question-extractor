# Typeform Question Extractor

**See every question, logic branch, and condition in any Typeform — at a glance.**

Typeform's one-question-at-a-time format is great for respondents but painful when you need the full picture. This project extracts the complete schema from any public Typeform URL and renders it as an interactive graph, Markdown table, Mermaid flowchart, or SVG — so you can prepare answers, document form structure, or audit branching logic without clicking through one screen at a time.

> **Note — Work in progress**
> The npm package (`typeform-extractor`) has **not been published yet**. It will be released in the upcoming weeks. For now you can use the library locally within this monorepo, or copy the github files to your project.

---

## How It Works

```
Typeform URL
     │
     ▼
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Fetch HTML  │ ──▶ │ Parse Schema│ ──▶ │   Build Graph    │
└─────────────┘     └─────────────┘     └──────────────────┘
                                                 │
                          ┌──────────────────────┼──────────────────────┐
                          ▼                      ▼                      ▼
                   Markdown Table         Mermaid Flowchart      React Flow Diagram
```

1. **Extract** — fetches the HTML of a public Typeform and parses the embedded JSON schema
2. **Graph** — builds a directed graph of questions, thank-you screens, and logic jumps
3. **Render** — outputs the graph in your format of choice

---

## Packages

This is a **pnpm monorepo** with two packages:

| Package | Description | Docs |
| ------- | ----------- | ---- |
| [`typeform-extractor`](./typeform-schema-extractor) | Zero-dependency TypeScript library for extracting and rendering Typeform schemas. *Not yet published to npm — coming soon.* | [README](./typeform-schema-extractor/README.md) |
| [`website`](./website) | Full-stack React web app (TanStack Start) — paste a URL, explore the graph, export results. | [README](./website/README.md) |

---

## Quick Start

**Prerequisites:** Node.js >= 18, pnpm

```bash
# Clone and install
git clone https://github.com/rooperipatti/typeform-question-extractor.git
cd typeform-question-extractor
pnpm install

# Start the website
pnpm dev
```

The dev server starts at [http://localhost:3000](http://localhost:3000).

### Use the library directly

> **Coming soon** — the package will be installable via `npm install typeform-extractor` once published. In the meantime, the library is available within the monorepo via `workspace:*`.

```ts
import { getTypeformSchema, buildGraph, toMermaidSource } from 'typeform-extractor'

const schema = await getTypeformSchema('https://example.typeform.com/to/XXXXX')
const graph  = buildGraph(schema)

console.log(toMermaidSource(graph))
```

---

## Scripts

Run from the repository root:

| Script | Description |
| ------ | ----------- |
| `pnpm dev` | Start the website dev server (port 3000) |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests across all packages |

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Package manager | pnpm (workspaces) |
| Library | TypeScript, ESM |
| Web framework | TanStack Start + TanStack Router |
| UI | React 19, Tailwind CSS v4 |
| Graph rendering | React Flow, Dagre |
| Testing | Vitest |

---

## Output Formats

| Format | Description |
| ------ | ----------- |
| **Markdown table** | Every field listed with type, required status, and logic conditions |
| **Mermaid flowchart** | Copy-pasteable diagram source with conditional and default edges |
| **React Flow (interactive)** | Zoomable, pannable graph with custom nodes and a legend |
| **SVG** | Rendered via Kroki from the Mermaid source — ready to embed anywhere |

---

## Project Structure

```
typeform-question-extractor/
├── typeform-schema-extractor/   # npm package
│   └── src/
│       ├── extractor.ts         # HTML fetch & JSON parsing
│       ├── graph.ts             # Schema → directed graph
│       ├── types.ts             # TypeScript type definitions
│       └── renderers/           # Markdown, Mermaid, React Flow
├── website/                     # Web app
│   └── src/
│       ├── routes/              # / (extractor) and /about
│       ├── components/          # Header, Footer, FormGraphViewer, …
│       └── lib/                 # Server functions
├── package.json                 # Workspace root
└── pnpm-workspace.yaml
```

---

## License

[MIT](./LICENSE) — Roope Ripatti
