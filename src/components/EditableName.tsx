import { useState } from 'react'

interface Props {
  value: string
  onCommit: (value: string) => void
  className?: string
}

/** Eingabefeld, das Änderungen bei Enter/Blur übernimmt */
export function EditableName({ value, onCommit, className }: Props) {
  const [draft, setDraft] = useState(value)
  const [prevValue, setPrevValue] = useState(value)

  if (value !== prevValue) {
    setPrevValue(value)
    setDraft(value)
  }

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onCommit(trimmed)
    else setDraft(value)
  }

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className={className}
    />
  )
}
