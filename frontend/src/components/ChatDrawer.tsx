import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { aiChat } from '../lib/api'
import { useStore } from '../state/useStore'
import Markdown from './Markdown'
import ErrorBanner from './ErrorBanner'

interface Turn {
  role: 'user' | 'assistant'
  content: string
}

/** Course Q&A chat, scoped to the current lesson's content via context. */
export default function ChatDrawer({ lessonContext, lessonTitle }: { lessonContext: string; lessonTitle: string }) {
  const aiConfig = useStore((s) => s.aiConfig)
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [turns, busy])

  const send = async () => {
    const question = input.trim()
    if (!question || !aiConfig || busy) return
    setInput('')
    setError(null)
    const nextTurns: Turn[] = [...turns, { role: 'user', content: question }]
    setTurns(nextTurns)
    setBusy(true)
    try {
      const answer = await aiChat(aiConfig, question, lessonContext, turns)
      setTurns([...nextTurns, { role: 'assistant', content: answer }])
    } catch (e) {
      setError(e)
      setTurns(turns) // roll back the unanswered question so retry is clean
      setInput(question)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open course assistant chat"
        className="fixed right-4 bottom-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-xl text-white shadow-lg transition hover:scale-105 hover:bg-indigo-700"
      >
        💬
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Course assistant"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="font-bold text-slate-900">Course assistant</h2>
              <p className="text-xs text-slate-500">Scoped to: {lessonTitle}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              ✕
            </button>
          </header>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {!aiConfig && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <Link to="/settings" className="font-medium underline">
                  Connect an AI provider
                </Link>{' '}
                to ask questions about this lesson.
              </p>
            )}
            {aiConfig && turns.length === 0 && (
              <p className="text-sm text-slate-500">
                Ask anything about this lesson — the assistant answers using the lesson content, and
                will say so rather than guess when it isn't sure.
              </p>
            )}
            {turns.map((t, i) =>
              t.role === 'user' ? (
                <div key={i} className="ml-8 rounded-2xl rounded-br-sm bg-indigo-600 p-3 text-sm text-white">
                  {t.content}
                </div>
              ) : (
                <div key={i} className="mr-4 rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 p-3">
                  <Markdown md={t.content} />
                </div>
              ),
            )}
            {busy && (
              <div className="mr-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
                Thinking…
              </div>
            )}
            <ErrorBanner error={error} onDismiss={() => setError(null)} />
          </div>
          <footer className="border-t border-slate-200 p-3">
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="chat-input">
                Ask the course assistant
              </label>
              <input
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                disabled={!aiConfig || busy}
                placeholder={aiConfig ? 'Ask about this lesson…' : 'Connect AI first'}
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 disabled:bg-slate-50"
              />
              <button
                onClick={send}
                disabled={!aiConfig || busy || !input.trim()}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </footer>
        </div>
      )}
    </>
  )
}
