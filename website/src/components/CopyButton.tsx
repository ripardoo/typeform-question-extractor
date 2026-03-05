import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface CopyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export default function CopyButton({ children, className = '', ...props }: CopyButtonProps) {
  return (
    <button
      type="button"
      className={`btn-press inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-medium text-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)] disabled:opacity-60 ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}
