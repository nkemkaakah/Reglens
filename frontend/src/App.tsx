import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <p className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
        RegLens Frontend
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
        React + Tailwind is ready
      </h1>
      <p className="max-w-xl text-sm text-slate-600 sm:text-base">
        This app now uses Tailwind utility classes only. Keep global styles in
        <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-slate-800">
          src/index.css
        </code>
        and build all UI from class names.
      </p>
      <button
        type="button"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        onClick={() => setCount((value) => value + 1)}
      >
        Count is {count}
      </button>
    </main>
  )
}

export default App
