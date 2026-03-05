import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex h-[10vh] shrink-0 items-center border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex w-full flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
          >
            <span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
            Typeform Schema Extractor
          </Link>
        </h2>

        <div className="ml-auto flex items-center gap-4 sm:gap-5">
          <Link
            to="/"
            className="nav-link text-sm font-medium"
            activeProps={{ className: 'nav-link is-active text-sm font-medium' }}
          >
            Home
          </Link>
          <Link
            to="/about"
            className="nav-link text-sm font-medium"
            activeProps={{ className: 'nav-link is-active text-sm font-medium' }}
          >
            About
          </Link>
          <span className="ml-2 sm:ml-3" aria-hidden>
            <ThemeToggle />
          </span>
        </div>
      </nav>
    </header>
  )
}
