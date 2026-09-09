import { useState, useRef } from 'react'

interface Props {
  value: string
  onCommit: (value: string) => void
  className?: string
  disabled?: boolean
}

export function EditableName({ value, onCommit, className, disabled }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [prevValue, setPrevValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  if (value !== prevValue) {
    setPrevValue(value)
    setDraft(value)
  }

  const startEditing = () => {
    if (!disabled) setEditing(true)
  }

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onCommit(trimmed)
    setEditing(false)
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        className={className}
        disabled={disabled}
        autoFocus
      />
    )
  }

  return (
    <span className={`group inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      <span className="min-w-0 flex-1 truncate">{value || <span className="italic text-slate-400">—</span>}</span>
      {!disabled && (
        <button
          type="button"
          onClick={startEditing}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 opacity-0 transition-opacity hover:border-zollern-400 hover:text-zollern-600 group-hover:opacity-100"
          title="Bearbeiten"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487zm0 0L19.5 7.125"
            />
          </svg>
        </button>
      )}
    </span>
  )
}
