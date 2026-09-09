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
    <span
      className={`${className} cursor-pointer select-none ${disabled ? 'opacity-50' : ''}`}
      onClick={startEditing}
      onDoubleClick={startEditing}
    >
      {value || <span className="text-slate-400 italic">—</span>}
      <svg
        className="ml-1.5 w-4 h-4 text-slate-400 hover:text-zollern-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-5M18.5 2.5a2.121 2.121 0 013 3L12 15h3a2 2 0 01-2 2v7a2 2 0 01-2 2H9.5" />
      </svg>
    </span>
  )
}