import { lazy, Suspense } from 'react'
import type { VizKind } from '../content/types'

const AttentionViz = lazy(() => import('./viz/AttentionViz'))
const GradientDescentViz = lazy(() => import('./viz/GradientDescentViz'))
const SoftmaxViz = lazy(() => import('./viz/SoftmaxViz'))
const TokenizerViz = lazy(() => import('./viz/TokenizerViz'))
const SimilarityViz = lazy(() => import('./viz/SimilarityViz'))
const ChunkingViz = lazy(() => import('./viz/ChunkingViz'))
const ContextWindowViz = lazy(() => import('./viz/ContextWindowViz'))
const StreamingViz = lazy(() => import('./viz/StreamingViz'))
const InferencePathViz = lazy(() => import('./viz/InferencePathViz'))

export default function VizBlock({ viz, caption }: { viz: VizKind; caption?: string }) {
  return (
    <figure className="my-6">
      <Suspense
        fallback={
          <div className="h-48 animate-pulse rounded-2xl bg-slate-800" role="status" aria-label="Loading visualization" />
        }
      >
        {viz === 'attention' && <AttentionViz />}
        {viz === 'gradientDescent' && <GradientDescentViz />}
        {viz === 'softmax' && <SoftmaxViz />}
        {viz === 'tokenizer' && <TokenizerViz />}
        {viz === 'similarity' && <SimilarityViz />}
        {viz === 'chunking' && <ChunkingViz />}
        {viz === 'contextWindow' && <ContextWindowViz />}
        {viz === 'streaming' && <StreamingViz />}
        {viz === 'inferencePath' && <InferencePathViz />}
      </Suspense>
      {caption && <figcaption className="mt-2 text-center text-xs text-slate-400">{caption}</figcaption>}
    </figure>
  )
}
