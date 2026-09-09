import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  value: string
  onCommit: (value: string) => void
  className?: string
  disabled?: boolean
  /** Nur das Stift-Symbol anzeigen (ohne den Wert davor) – z. B. wenn der Name schon woanders steht */
  iconOnly?: boolean
}

export function EditableName({ value, onCommit, className, disabled, iconOnly }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const openEditor = () => {
    if (disabled) return
    setDraft(value)
    setOpen(true)
  }

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onCommit(trimmed)
    setOpen(false)
  }

  const cancel = () => setOpen(false)

  const editButton = (
    <button
      type="button"
      onClick={openEditor}
      disabled={disabled}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:border-zollern-400 hover:text-zollern-600 disabled:opacity-40 ${
        iconOnly ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'
      }`}
      title="Bearbeiten"
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487zm0 0L19.5 7.125"
        />
      </svg>
    </button>
  )

  return (
    <>
      {iconOnly ? (
        editButton
      ) : (
        <span className={`group inline-flex min-w-0 items-center gap-1.5 ${className}`}>
          <span className="min-w-0 flex-1 truncate">
            {value || <span className="italic text-slate-400">—</span>}
          </span>
          {!disabled && editButton}
        </span>
      )}

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
            onClick={cancel}
          >
            <div
              className="w-full max-w-xs rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Umbenennen</h3>
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit()
                  if (e.key === 'Escape') cancel()
                }}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-zollern-500"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={cancel}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Abbrechen
                </button>
                <button
                  onClick={commit}
                  className="rounded bg-zollern-700 px-3 py-1.5 text-sm text-white hover:bg-zollern-800"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
