# Typeform Schema Extractor — Website

The front-end for **Typeform Schema Extractor**. Paste any Typeform URL and instantly see every question, logic branch, and condition laid out — then export the structure as a Markdown table, Mermaid flowchart, or SVG.

## Tech Stack

- **Framework** — [TanStack Start](https://tanstack.com/start) (full-stack React with SSR)
- **Routing** — [TanStack Router](https://tanstack.com/router) (file-based)
- **Styling** — [Tailwind CSS v4](https://tailwindcss.com/)
- **Graph** — [React Flow](https://reactflow.dev/) + [Dagre](https://github.com/dagrejs/dagre) layout
- **Testing** — [Vitest](https://vitest.dev/)

## Getting Started

From the **repository root** (pnpm workspace):

```bash
pnpm install
pnpm --filter website dev
```

The dev server starts at [http://localhost:3000](http://localhost:3000).

## Scripts

| Script            | Description                    |
| ----------------- | ------------------------------ |
| `pnpm dev`        | Start the Vite dev server      |
| `pnpm build`      | Production build (SSR + client)|
| `pnpm preview`    | Preview the production build   |
| `pnpm test`       | Run tests with Vitest          |

## Project Structure

```
src/
├── components/      # Reusable UI (Header, Footer, FormGraphViewer, …)
├── context/         # React context providers (ToastContext)
├── lib/             # Server functions (Typeform fetch, Mermaid SVG)
├── routes/          # File-based routes (__root, index, about)
├── styles.css       # Tailwind base + custom theme
└── router.tsx       # TanStack Router config
```

## Routes

| Path     | Description                                         |
| -------- | --------------------------------------------------- |
| `/`      | Main extractor — URL input, graph viewer, exports   |
| `/about` | Motivation, features, and project links             |
