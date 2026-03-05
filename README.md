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
| `pnpm test` | Run unit tests across all packages (Vitest) |
| `pnpm typecheck` | Run `tsc --noEmit` across all packages |
| `pnpm --filter website run e2e` | Run website E2E tests (Playwright) |

---

## Testing

### Unit tests (Vitest)

```bash
pnpm test
```

Runs Vitest across all packages. The `typeform-schema-extractor` package has regression tests covering schema extraction, graph building, and all renderers. The website package excludes its `e2e/` directory from Vitest so the two test runners don't conflict.

### E2E tests (Playwright)

```bash
pnpm --filter website run e2e        # headless
pnpm --filter website run e2e:ui     # interactive UI mode
```

E2E tests verify the website against a production build (Vite preview on port 5180). They are split into three spec files that run **in parallel** across multiple Playwright workers:

| Spec file | Tests | What it covers |
| --------- | :---: | -------------- |
| `smoke.spec.ts` | 9 | Page loads, routing, form validation, navigation, theme toggle |
| `extract.spec.ts` | 2 | Loading state and full extraction flow (fields table, sections, export area) |
| `export.spec.ts` | 5 | Markdown/Mermaid copy & download, SVG copy (serial block — extracts once, reuses the page) |

**URL validation gate** — Before tests run, a global setup step checks that the Typeform URLs in `test_files/urls.txt` and `test_files/embeddedUrls.txt` are reachable. Tests that depend on a live Typeform are automatically **skipped** when no URLs are available, so the suite passes cleanly in offline or restricted environments.

To validate URLs independently:

```bash
pnpm --filter website run test:urls
```

---

## CI/CD

A single GitHub Actions workflow (`.github/workflows/ci.yml`) handles everything:

```
push / PR to master ──┬── Typecheck (tsc --noEmit)
                      ├── Unit tests (Vitest)
                      └── E2E tests (Playwright)
                                │
                          all pass + master push
                                │
                                ▼
                        Deploy website (Cloudflare Workers)

tag push v* ──────────▶ Publish to npm
```

- **Typecheck, unit tests, and e2e** run in parallel on every push and PR.
- **Deploy** runs only on master after all three jobs pass. Uses `cloudflare/wrangler-action` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.
- **npm publish** triggers independently on version tags (e.g. `git tag v1.0.0 && git push --tags`). A safety check verifies the tag matches `package.json` version before publishing. Requires an `NPM_TOKEN` secret.

### Required repository secrets

| Secret | Used by |
| ------ | ------- |
| `NPM_TOKEN` | `publish-npm` job |
| `CLOUDFLARE_API_TOKEN` | `deploy-website` job |
| `CLOUDFLARE_ACCOUNT_ID` | `deploy-website` job |

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Package manager | pnpm (workspaces) |
| Library | TypeScript, ESM |
| Web framework | TanStack Start + TanStack Router |
| UI | React 19, Tailwind CSS v4 |
| Graph rendering | React Flow, Dagre |
| Unit testing | Vitest |
| E2E testing | Playwright (Chromium) |
| CI/CD | GitHub Actions |
| Hosting | Cloudflare Workers |
| Package registry | npm |

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
├── .github/workflows/
│   └── ci.yml                   # Unified CI/CD pipeline
├── typeform-schema-extractor/   # npm package
│   └── src/
│       ├── extractor.ts         # HTML fetch & JSON parsing
│       ├── graph.ts             # Schema → directed graph
│       ├── types.ts             # TypeScript type definitions
│       ├── renderers/           # Markdown, Mermaid, React Flow
│       └── __tests__/           # Vitest regression tests
├── website/                     # Web app
│   ├── src/
│   │   ├── routes/              # / (extractor) and /about
│   │   ├── components/          # Header, Footer, FormGraphViewer, …
│   │   └── lib/                 # Server functions
│   ├── e2e/                     # Playwright E2E tests
│   │   ├── smoke.spec.ts        # Routing, validation, navigation
│   │   ├── extract.spec.ts      # Extraction flow
│   │   └── export.spec.ts       # Export actions (serial)
│   └── wrangler.toml            # Cloudflare Workers config
├── test_files/                  # Shared test data (URLs, HTML fixtures)
├── package.json                 # Workspace root
└── pnpm-workspace.yaml
```

---

## License

[MIT](./LICENSE) — Roope Ripatti
