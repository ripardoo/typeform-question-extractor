export default function Footer() {
  return (
    <footer className="site-footer flex h-[10vh] shrink-0 items-center border-t border-[var(--line)] px-4 text-[var(--sea-ink-soft)]">
      <div className="page-wrap flex w-full flex-wrap items-center justify-center gap-4 text-center">
        <p className="m-0 text-sm">
          Developed by{' '}
          <a
            href="https://x.com/RoopeRipatti"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--sea-ink)] underline decoration-[var(--line)] underline-offset-2 hover:decoration-[var(--sea-ink-soft)]"
          >
            Roope Ripatti
          </a>
        </p>
        <a
          href="https://www.buymeacoffee.com/ripattir"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#000000] bg-[#FFDD00] px-4 py-2 text-sm font-medium no-underline shadow-sm transition hover:opacity-90 dark:border-[#000000]"
          style={{ color: '#000000' }}
        >
          <span aria-hidden>☕</span>
          Buy me a coffee
        </a>
      </div>
    </footer>
  )
}
