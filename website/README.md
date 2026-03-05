# Typeform Schema Extractor — Website

The front-end for **Typeform Schema Extractor**. Paste any Typeform URL and instantly see every question, logic branch, and condition laid out — then export the structure as a Markdown table, Mermaid flowchart, or SVG.

## Tech Stack

- **Framework** — [TanStack Start](https://tanstack.com/start) (full-stack React with SSR)
- **Routing** — [TanStack Router](https://tanstack.com/router) (file-based)
- **Styling** — [Tailwind CSS v4](https://tailwindcss.com/)
- **Graph** — [React Flow](https://reactflow.dev/) + [Dagre](https://github.com/dagrejs/dagre) layout
- **Testing** — [Vitest](https://vitest.dev/) (unit), [Playwright](https://playwright.dev/) (e2e)

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
| `pnpm test`       | Run unit tests with Vitest      |
| `pnpm e2e`        | Run E2E tests with Playwright  |
| `pnpm e2e:ui`     | Run E2E tests in UI mode        |
| `pnpm test:urls`   | Validate test-file URLs (reachability) |

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

## E2E tests

E2E tests use Playwright and run against the built app (preview). From the repo root:

```bash
pnpm --filter website run e2e
```

Tests use URLs listed in `test_files/urls.txt` and `test_files/embeddedUrls.txt`. Before running, **global setup** checks that each URL is reachable; tests that depend on a live Typeform (extract flow, export actions) are **skipped** when no URLs are available, so the suite can pass in environments without access to those URLs.

To validate URLs without running the full e2e suite:

```bash
pnpm --filter website run test:urls
```
