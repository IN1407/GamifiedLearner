import { lazy, Suspense } from 'react'
import type { VizKind } from '../content/types'

const AttentionViz = lazy(() => import('./viz/AttentionViz'))
const GradientDescentViz = lazy(() => import('./viz/GradientDescentViz'))
const SoftmaxViz = lazy(() => import('./viz/SoftmaxViz'))

export default function VizBlock({ viz, caption }: { viz: VizKind; caption?: string }) {
  return (
    <figure className="my-6">
      <Suspense
        fallback={
          <div className="h-48 animate-pulse rounded-2xl bg-slate-100" role="status" aria-label="Loading visualization" />
        }
      >
        {viz === 'attention' && <AttentionViz />}
        {viz === 'gradientDescent' && <GradientDescentViz />}
        {viz === 'softmax' && <SoftmaxViz />}
      </Suspense>
      {caption && <figcaption className="mt-2 text-center text-xs text-slate-500">{caption}</figcaption>}
    </figure>
  )
}
