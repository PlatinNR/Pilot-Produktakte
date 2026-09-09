import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center bg-white p-8">
          <div className="max-w-lg rounded-lg border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-bold text-red-700">Es ist ein Fehler aufgetreten</h1>
            <pre className="mt-3 whitespace-pre-wrap break-words text-sm text-red-800">
              {this.state.error.message}
            </pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
