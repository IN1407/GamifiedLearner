// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TokenizerViz from './TokenizerViz'
import SimilarityViz from './SimilarityViz'
import ChunkingViz from './ChunkingViz'
import ContextWindowViz from './ContextWindowViz'
import StreamingViz from './StreamingViz'
import InferencePathViz from './InferencePathViz'

// Smoke-render each visualization to confirm it mounts without throwing and
// draws its initial (deterministic) state from data.
describe('teaching visualizations render', () => {
  it('TokenizerViz shows token + character stats', () => {
    const html = renderToStaticMarkup(<TokenizerViz />)
    expect(html).toContain('Tokenizer explorer')
    expect(html).toContain('Tokens')
    expect(html).toContain('Characters')
  })

  it('SimilarityViz shows a cosine similarity value and both word vectors', () => {
    const html = renderToStaticMarkup(<SimilarityViz />)
    expect(html).toContain('Vector similarity')
    expect(html).toContain('cosine similarity')
    expect(html).toContain('cat')
    expect(html).toContain('kitten')
  })

  it('ChunkingViz renders the sample document with chunk shading', () => {
    const html = renderToStaticMarkup(<ChunkingViz />)
    expect(html).toContain('Chunking visualizer')
    expect(html).toContain('chunk')
    // renders per-character spans with background colors
    expect(html).toContain('background-color')
  })

  it('ContextWindowViz shows the budget and response headroom', () => {
    const html = renderToStaticMarkup(<ContextWindowViz />)
    expect(html).toContain('Context-window budget')
    expect(html).toContain('System prompt')
    expect(html).toContain('Retrieved context')
    // initial state fits, so it advertises free response tokens
    expect(html).toContain('free for the reply')
  })

  it('StreamingViz starts idle with a play prompt and token counter', () => {
    const html = renderToStaticMarkup(<StreamingViz />)
    expect(html).toContain('Streaming generation')
    expect(html).toContain('Play')
    expect(html).toContain('tokens')
  })

  it('InferencePathViz shows both modes and trade-off annotations', () => {
    const html = renderToStaticMarkup(<InferencePathViz />)
    expect(html).toContain('Local vs hosted inference')
    expect(html).toContain('Privacy')
    // default hosted mode shows the datacenter GPU node
    expect(html).toContain('Datacenter GPU')
  })
})
